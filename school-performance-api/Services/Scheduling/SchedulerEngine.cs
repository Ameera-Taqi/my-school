namespace SchoolPerformance.Api.Services.Scheduling;

/// <summary>One "class studies subject with teacher for N periods" requirement.</summary>
public sealed class LessonRequirement
{
    public long AssignmentId { get; init; }
    public long ClassId { get; init; }
    public long SubjectId { get; init; }
    public long TeacherId { get; init; }
    public int PeriodsPerWeek { get; init; }
}

/// <summary>A lesson already fixed on the timetable (manual/locked) that the solver must respect.</summary>
public sealed record FixedLesson(long ClassId, int Slot, long SubjectId, long TeacherId);

public sealed record PlacedLesson(long ClassId, int Day, int Period, long SubjectId, long TeacherId, long AssignmentId);

public sealed class SchedulerInput
{
    public const int Days = 5;
    public const int Periods = 7;
    public const int Slots = Days * Periods;

    public List<LessonRequirement> Requirements { get; init; } = new();
    /// <summary>teacherId → 35 booleans (slot allowed?).</summary>
    public Dictionary<long, bool[]> TeacherAllowed { get; init; } = new();
    /// <summary>teacherId → max periods per day.</summary>
    public Dictionary<long, int> TeacherMaxPerDay { get; init; } = new();
    public List<FixedLesson> Fixed { get; init; } = new();
    public int? Seed { get; init; }
    public TimeSpan TimeLimit { get; init; } = TimeSpan.FromSeconds(6);
    public int MaxAttempts { get; init; } = 6;
}

public sealed class SchedulerOutput
{
    public bool Complete { get; init; }
    public List<PlacedLesson> Placed { get; init; } = new();
    /// <summary>assignmentId → how many lessons could not be placed.</summary>
    public Dictionary<long, int> Missing { get; init; } = new();
    public int Attempts { get; init; }
}

/// <summary>
/// Constraint-based timetable solver: backtracking search with a most-constrained-first variable order,
/// random restarts and a time budget. Hard rules: one lesson per class slot, a teacher is never in two
/// classrooms in the same slot, teacher availability constraints, and max periods per day per teacher.
/// Soft preferences (used only to order candidates): spread a subject across the week and balance daily load.
/// </summary>
public sealed class SchedulerEngine
{
    private sealed class State
    {
        public required LessonRequirement[] Reqs;
        public required int[] Remaining;
        public required Dictionary<long, long[]> ClassSlots;   // classId → slot → assignmentId (0 = free, -1 = fixed)
        public required Dictionary<long, long[]> ClassSubj;    // classId → slot → subjectId
        public required Dictionary<long, bool[]> TeacherBusy;
        public required Dictionary<long, int[]> TeacherDay;
        public required Dictionary<long, bool[]> Allowed;
        public required Dictionary<long, int> MaxPerDay;
        public required Random Rng;
        public int Nodes;
        public int NodeLimit;
        public DateTime Deadline;
        public List<PlacedLesson> Placed = new();
    }

    public SchedulerOutput Solve(SchedulerInput input)
    {
        var baseSeed = input.Seed ?? Environment.TickCount;
        var started = DateTime.UtcNow;
        var perAttempt = TimeSpan.FromMilliseconds(Math.Max(500, input.TimeLimit.TotalMilliseconds / input.MaxAttempts));
        SchedulerOutput? best = null;

        for (var attempt = 1; attempt <= input.MaxAttempts; attempt++)
        {
            var state = BuildState(input, new Random(baseSeed + attempt * 7919));
            state.Deadline = DateTime.UtcNow + perAttempt;
            state.NodeLimit = 150_000;

            bool complete;
            try { complete = Backtrack(state); }
            catch (TimeoutException) { complete = false; }

            if (complete)
            {
                return new SchedulerOutput { Complete = true, Placed = state.Placed, Attempts = attempt };
            }

            // Partial timetable: place what is still possible so the caller can report what is missing and why.
            var greedy = BuildState(input, new Random(baseSeed + attempt * 104729));
            greedy.Deadline = DateTime.MaxValue;
            greedy.NodeLimit = int.MaxValue;
            Greedy(greedy);
            var missing = new Dictionary<long, int>();
            for (var i = 0; i < greedy.Reqs.Length; i++)
            {
                if (greedy.Remaining[i] > 0) missing[greedy.Reqs[i].AssignmentId] = greedy.Remaining[i];
            }
            var candidate = new SchedulerOutput { Complete = false, Placed = greedy.Placed, Missing = missing, Attempts = attempt };
            if (best == null || candidate.Placed.Count > best.Placed.Count) best = candidate;

            if (DateTime.UtcNow - started > input.TimeLimit) break;
        }

        return best ?? new SchedulerOutput();
    }

    private static State BuildState(SchedulerInput input, Random rng)
    {
        var reqs = input.Requirements.Where(r => r.PeriodsPerWeek > 0).ToArray();
        var classIds = reqs.Select(r => r.ClassId).Concat(input.Fixed.Select(f => f.ClassId)).Distinct().ToList();
        var teacherIds = reqs.Select(r => r.TeacherId).Concat(input.Fixed.Select(f => f.TeacherId)).Distinct().ToList();

        var state = new State
        {
            Reqs = reqs,
            Remaining = reqs.Select(r => r.PeriodsPerWeek).ToArray(),
            ClassSlots = classIds.ToDictionary(c => c, _ => new long[SchedulerInput.Slots]),
            ClassSubj = classIds.ToDictionary(c => c, _ => new long[SchedulerInput.Slots]),
            TeacherBusy = teacherIds.ToDictionary(t => t, _ => new bool[SchedulerInput.Slots]),
            TeacherDay = teacherIds.ToDictionary(t => t, _ => new int[SchedulerInput.Days]),
            Allowed = teacherIds.ToDictionary(t => t, t => input.TeacherAllowed.TryGetValue(t, out var a) ? a : Enumerable.Repeat(true, SchedulerInput.Slots).ToArray()),
            MaxPerDay = input.TeacherMaxPerDay,
            Rng = rng
        };

        foreach (var f in input.Fixed)
        {
            state.ClassSlots[f.ClassId][f.Slot] = -1;
            state.ClassSubj[f.ClassId][f.Slot] = f.SubjectId;
            state.TeacherBusy[f.TeacherId][f.Slot] = true;
            state.TeacherDay[f.TeacherId][f.Slot / SchedulerInput.Periods]++;
            var idx = Array.FindIndex(reqs, r => r.ClassId == f.ClassId && r.SubjectId == f.SubjectId && r.TeacherId == f.TeacherId);
            if (idx >= 0 && state.Remaining[idx] > 0) state.Remaining[idx]--;
        }
        return state;
    }

    private static bool Backtrack(State s)
    {
        if (++s.Nodes > s.NodeLimit || (s.Nodes % 512 == 0 && DateTime.UtcNow > s.Deadline))
        {
            throw new TimeoutException();
        }

        var idx = PickMostConstrained(s, out var candidates);
        if (idx < 0) return true;
        if (candidates.Count == 0) return false;

        foreach (var slot in Order(s, idx, candidates))
        {
            Place(s, idx, slot);
            if (Backtrack(s)) return true;
            Unplace(s, idx, slot);
        }
        return false;
    }

    private static void Greedy(State s)
    {
        var stuck = new HashSet<int>();
        while (true)
        {
            var idx = PickMostConstrained(s, out var candidates, stuck);
            if (idx < 0) return;
            if (candidates.Count == 0) { stuck.Add(idx); continue; }
            Place(s, idx, Order(s, idx, candidates).First());
        }
    }

    /// <summary>Requirement with lessons left and the fewest legal slots (ties: more lessons left).</summary>
    private static int PickMostConstrained(State s, out List<int> bestCandidates, HashSet<int>? skip = null)
    {
        var bestIdx = -1;
        bestCandidates = new List<int>();
        var bestCount = int.MaxValue;
        for (var i = 0; i < s.Reqs.Length; i++)
        {
            if (s.Remaining[i] <= 0 || (skip != null && skip.Contains(i))) continue;
            var c = Candidates(s, i);
            if (c.Count < bestCount || (c.Count == bestCount && s.Remaining[i] > s.Remaining[bestIdx]))
            {
                bestCount = c.Count;
                bestIdx = i;
                bestCandidates = c;
                if (bestCount == 0) break;
            }
        }
        return bestIdx;
    }

    private static List<int> Candidates(State s, int idx)
    {
        var r = s.Reqs[idx];
        var classSlots = s.ClassSlots[r.ClassId];
        var busy = s.TeacherBusy[r.TeacherId];
        var allowed = s.Allowed[r.TeacherId];
        var dayCount = s.TeacherDay[r.TeacherId];
        var max = s.MaxPerDay.TryGetValue(r.TeacherId, out var m) ? m : int.MaxValue;
        var list = new List<int>(SchedulerInput.Slots);
        for (var slot = 0; slot < SchedulerInput.Slots; slot++)
        {
            if (classSlots[slot] != 0 || busy[slot] || !allowed[slot]) continue;
            if (dayCount[slot / SchedulerInput.Periods] >= max) continue;
            list.Add(slot);
        }
        return list;
    }

    /// <summary>Prefer days where this subject is not yet taught, then lighter days for the class, then a little randomness.</summary>
    private static List<int> Order(State s, int idx, List<int> candidates)
    {
        var r = s.Reqs[idx];
        var subj = s.ClassSubj[r.ClassId];
        var classSlots = s.ClassSlots[r.ClassId];
        var subjectPerDay = new int[SchedulerInput.Days];
        var loadPerDay = new int[SchedulerInput.Days];
        for (var slot = 0; slot < SchedulerInput.Slots; slot++)
        {
            var d = slot / SchedulerInput.Periods;
            if (subj[slot] == r.SubjectId) subjectPerDay[d]++;
            if (classSlots[slot] != 0) loadPerDay[d]++;
        }
        return candidates
            .Select(slot => (slot, key: subjectPerDay[slot / SchedulerInput.Periods] * 100 + loadPerDay[slot / SchedulerInput.Periods] * 3 + s.Rng.Next(0, 3)))
            .OrderBy(x => x.key)
            .Select(x => x.slot)
            .ToList();
    }

    private static void Place(State s, int idx, int slot)
    {
        var r = s.Reqs[idx];
        s.ClassSlots[r.ClassId][slot] = r.AssignmentId;
        s.ClassSubj[r.ClassId][slot] = r.SubjectId;
        s.TeacherBusy[r.TeacherId][slot] = true;
        s.TeacherDay[r.TeacherId][slot / SchedulerInput.Periods]++;
        s.Remaining[idx]--;
        s.Placed.Add(new PlacedLesson(r.ClassId, slot / SchedulerInput.Periods, slot % SchedulerInput.Periods + 1, r.SubjectId, r.TeacherId, r.AssignmentId));
    }

    private static void Unplace(State s, int idx, int slot)
    {
        var r = s.Reqs[idx];
        s.ClassSlots[r.ClassId][slot] = 0;
        s.ClassSubj[r.ClassId][slot] = 0;
        s.TeacherBusy[r.TeacherId][slot] = false;
        s.TeacherDay[r.TeacherId][slot / SchedulerInput.Periods]--;
        s.Remaining[idx]++;
        s.Placed.RemoveAt(s.Placed.Count - 1);
    }
}
