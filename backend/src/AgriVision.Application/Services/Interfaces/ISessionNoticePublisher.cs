namespace AgriVision.Application.Services.Interfaces;

public record SessionNotice(string Code, string Message)
{
    public static SessionNotice Locked(string? reason) => new("account_locked",
        "Tài khoản của bạn đã bị khóa." + (string.IsNullOrWhiteSpace(reason) ? "" : " Lý do: " + reason));

    public static SessionNotice Revoked(string reason) => new("admin_logout", reason == "admin_logout"
        ? "Bạn đã bị quản trị viên cưỡng chế đăng xuất. Vui lòng đăng nhập lại."
        : "Phiên đăng nhập cũ đã bị thu hồi khi tài khoản bị khóa. Tài khoản hiện hoạt động; vui lòng đăng nhập lại.");
}

public interface ISessionNoticePublisher
{
    // Called only after revocation commits. Notification failure must not undo revocation.
    Task PublishAsync(IReadOnlyCollection<Guid> sessionIds, SessionNotice notice);
}
