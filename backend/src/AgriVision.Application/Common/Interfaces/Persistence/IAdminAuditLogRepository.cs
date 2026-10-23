using AgriVision.Domain.Entities;

namespace AgriVision.Application.Common.Interfaces.Persistence;

public interface IAdminAuditLogRepository
{
    Task AddAsync(AdminAuditLog log, CancellationToken cancellationToken = default);
    Task<(IEnumerable<AdminAuditLog> Logs, int TotalCount)> GetPagedLogsAsync(
        int pageNumber = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default);
}
