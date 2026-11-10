using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AgriVision.Infrastructure.Persistence.Repositories;

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _context;

    public UserRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
    }

    public async Task<User?> GetByIdForUpdateAsync(Guid id, CancellationToken cancellationToken = default)
    {
        if (!_context.Database.IsRelational())
        {
            return await GetByIdAsync(id, cancellationToken);
        }

        return await _context.Users
            .FromSqlInterpolated($"SELECT * FROM users WHERE id = {id} FOR UPDATE")
            .FirstOrDefaultAsync(cancellationToken);
    }


    public async Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        return await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower(), cancellationToken);
    }

    public async Task<User?> GetByEmailForUpdateAsync(string email, CancellationToken cancellationToken = default)
    {
        if (!_context.Database.IsRelational())
        {
            return await GetByEmailAsync(email, cancellationToken);
        }

        var emailLower = email.ToLower();
        return await _context.Users
            .FromSqlInterpolated($"SELECT * FROM users WHERE LOWER(email) = {emailLower} FOR UPDATE")
            .FirstOrDefaultAsync(cancellationToken);
    }


    public async Task<bool> ExistsByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        return await _context.Users.AnyAsync(u => u.Email.ToLower() == email.ToLower(), cancellationToken);
    }

    public async Task AddAsync(User user, CancellationToken cancellationToken = default)
    {
        await _context.Users.AddAsync(user, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(User user, CancellationToken cancellationToken = default)
    {
        var entry = _context.Entry(user);
        if (entry.State == EntityState.Detached)
        {
            _context.Users.Attach(user);
            entry.State = EntityState.Modified;
        }
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateProfileAsync(Guid userId, string fullName, DateTime updatedAt, CancellationToken cancellationToken = default)
    {
        var rowsAffected = await _context.Users
            .Where(u => u.Id == userId)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(u => u.FullName, fullName)
                .SetProperty(u => u.UpdatedAt, updatedAt),
                cancellationToken);

        if (rowsAffected == 0)
        {
            throw new KeyNotFoundException($"User with ID '{userId}' not found.");
        }
    }

    public async Task<string?> GetAvatarUrlAsync(Guid userId, CancellationToken cancellationToken = default) =>
        await _context.Users.Where(user => user.Id == userId).Select(user => user.AvatarUrl).FirstOrDefaultAsync(cancellationToken);

    public async Task UpdateAvatarAsync(Guid userId, string avatarUrl, DateTime updatedAt, CancellationToken cancellationToken = default)
    {
        var rows = await _context.Users.Where(user => user.Id == userId).ExecuteUpdateAsync(update => update
            .SetProperty(user => user.AvatarUrl, avatarUrl).SetProperty(user => user.UpdatedAt, updatedAt), cancellationToken);
        if (rows == 0) throw new KeyNotFoundException("User not found.");
    }

    public async Task<(IEnumerable<User> Users, int TotalCount)> GetPagedUsersAsync(
        string? search = null,
        string? role = null,
        bool? isActive = null,
        int pageNumber = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Users
            .AsNoTracking()
            .Include(u => u.Predictions)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.Trim().ToLower();
            query = query.Where(u => u.FullName.ToLower().Contains(searchLower) || u.Email.ToLower().Contains(searchLower));
        }

        if (!string.IsNullOrWhiteSpace(role))
        {
            query = query.Where(u => u.Role == role);
        }

        if (isActive.HasValue)
        {
            query = query.Where(u => u.IsActive == isActive.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var page = pageNumber < 1 ? 1 : pageNumber;
        var size = pageSize < 1 ? 10 : pageSize;

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .ThenByDescending(u => u.Id)
            .Skip((page - 1) * size)
            .Take(size)
            .ToListAsync(cancellationToken);

        return (users, totalCount);
    }
}
