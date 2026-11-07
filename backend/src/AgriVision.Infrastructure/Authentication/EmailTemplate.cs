namespace AgriVision.Infrastructure.Authentication;

internal static class EmailTemplate
{
    public static string Create(string title, string intro, string? code, string footer) => $"""
        <!doctype html><html lang="vi"><body style="margin:0;background:#f4f2ea;padding:32px 16px;font-family:Arial,sans-serif;color:#17251b">
        <div style="max-width:560px;margin:auto;background:#fbfaf6;border:1px solid #ccd7c8;border-radius:16px;padding:32px">
          <div style="color:#17613a;font-size:22px;font-weight:700;margin-bottom:24px">AgriAI</div>
          <h1 style="font-size:24px;margin:0 0 12px">{title}</h1><p style="font-size:16px;line-height:1.6;color:#5f6d62">{intro}</p>
          {(code is null ? "" : $"<div style=\"margin:24px 0;padding:18px;text-align:center;background:#e9eee5;border-radius:12px;color:#17613a;font-size:30px;font-weight:700;letter-spacing:8px\">{code}</div>")}
          <p style="font-size:14px;line-height:1.6;color:#5f6d62">{footer}</p><p style="font-size:13px;color:#879389">Email tự động từ AgriAI.</p>
        </div></body></html>
        """;
}
