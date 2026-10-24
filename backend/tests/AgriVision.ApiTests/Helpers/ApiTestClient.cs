using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using AgriVision.Application.DTOs.Auth;
using AgriVision.Infrastructure.Persistence;
using AgriVision.TestSupport;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AgriVision.ApiTests.Helpers;

internal static class ApiTestClient
{
    public const string Password = "Password123!";

    public static async Task<AuthResponse> Register(HttpClient client)
    {
        using var response = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("API fixture", $"api_{Guid.NewGuid():N}@example.test", Password));
        response.EnsureSuccessStatusCode();
        var auth = (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);
        return auth;
    }

    public static async Task<AuthResponse> Admin(HttpClient client, AgriVisionFactory factory)
    {
        var registered = await Register(client);
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Users.Where(user => user.Id == registered.User.Id).ExecuteUpdateAsync(update => update.SetProperty(user => user.Role, "Admin"));
        }
        using var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(registered.User.Email, Password));
        response.EnsureSuccessStatusCode();
        var auth = (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);
        return auth;
    }

    public static async Task<JsonElement> Json(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.Clone();
    }
}
