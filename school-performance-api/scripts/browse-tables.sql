-- SchoolPerformance: quick look at every table.
-- In DBeaver: press Alt+X (Execute script) to run all queries, each opens in its own result tab.
USE SchoolPerformance;

SELECT t.name AS [table], SUM(p.rows) AS [rows]
FROM sys.tables t JOIN sys.partitions p ON p.object_id = t.object_id AND p.index_id IN (0, 1)
GROUP BY t.name ORDER BY t.name;

SELECT TOP 100 * FROM Users;
SELECT TOP 100 * FROM Roles;
SELECT TOP 100 * FROM UserRoles;
SELECT TOP 100 * FROM Permissions;
SELECT TOP 200 * FROM RolePermissions;
SELECT TOP 100 * FROM Departments;
SELECT TOP 100 * FROM Teachers;
SELECT TOP 100 * FROM AcademicStages;
SELECT TOP 100 * FROM SchoolClasses;
SELECT TOP 100 * FROM Students;
SELECT TOP 100 * FROM CalendarEvents;
SELECT TOP 100 * FROM CalendarEventTargetRoles;
SELECT TOP 100 * FROM Meetings;
SELECT TOP 100 * FROM Tasks;
SELECT TOP 100 * FROM Reports;
SELECT TOP 100 * FROM Attendance;
SELECT TOP 100 * FROM InternalRequests;
