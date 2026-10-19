using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AgriVision.Infrastructure.Persistence.Repositories;

public class AdminAuditLogRepository : IAdminAuditLogRepository
{
    private readonly AppDbContext _context;

    public AdminAuditLogRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(AdminAuditLog log, CancellationToken cancellationToken = default)
    {
        await _context.AdminAuditLogs.AddAsync(log, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<(IEnumerable<AdminAuditLog> Logs, int TotalCount)> GetPagedLogsAsync(
        int pageNumber = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var page = pageNumber < 1 ? 1 : pageNumber;
        var size = pageSize < 1 ? 20 : pageSize;

        var query = _context.AdminAuditLogs
            .AsNoTracking()
            .Include(l => l.ActorUser)
            .Include(l => l.TargetUser)
            .OrderByDescending(l => l.OccurredAt);

        var totalCount = await query.CountAsync(cancellationToken);

        var logs = await query
            .Skip((page - 1) * size)
            .Take(size)
            .ToListAsync(cancellationToken);

        return (logs, totalCount);
    }
}
