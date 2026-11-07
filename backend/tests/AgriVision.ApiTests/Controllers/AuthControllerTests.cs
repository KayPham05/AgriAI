using System.Net;
using System.Net.Http.Json;
using System.Net.Http.Headers;
using System.Text.RegularExpressions;
using AgriVision.Application.DTOs.Auth;
using AgriVision.TestSupport;
using FluentAssertions;
using Xunit;

namespace AgriVision.ApiTests.Controllers;

public class AuthControllerTests : IClassFixture<AgriVisionFactory>
{
    private readonly HttpClient _client;
    private readonly AgriVisionFactory.TestInbox _inbox;

    public AuthControllerTests(AgriVisionFactory factory)
    {
        _client = factory.CreateClient();
        _inbox = factory.Inbox;
    }

    [Fact]
    [Trait("ApiCase", "auth.password_reset")]
    public async Task ResetPassword_ShouldConsumeCodeAndReplacePassword()
    {
        var email = $"reset_{Guid.NewGuid():N}@example.com";
        await RegisterAsync(email);
        var request = await _client.PostAsJsonAsync("/api/auth/forgot-password", new { email });
        request.StatusCode.Should().Be(HttpStatusCode.Accepted);
        var message = _inbox.Read(email, "Mã đặt lại mật khẩu AgriAI").Should().ContainSingle().Which;
        var code = Regex.Match(message, @"\b[0-9]{8}\b").Value;

        var verify = await _client.PostAsJsonAsync("/api/auth/reset-password/verify", new { code });
        verify.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var response = await _client.PostAsJsonAsync("/api/auth/reset-password", new { code, password = "NewPassword123!" });
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var replay = await _client.PostAsJsonAsync("/api/auth/reset-password", new { code, password = "OtherPassword123!" });
        replay.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var oldLogin = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, "Password123!"));
        oldLogin.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var newLogin = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, "NewPassword123!"));
        newLogin.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    [Trait("ApiCase", "auth.two_factor.lifecycle")]
    public async Task LoginWithTwoFactor_ShouldIssueSessionAndNoticeOnlyAfterCodeVerification()
    {
        var email = $"mfa_{Guid.NewGuid():N}@example.com";
        var session = await RegisterAsync(email);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", session.Token);
        var setup = await _client.PostAsync("/api/auth/two-factor/setup", null);
        setup.StatusCode.Should().Be(HttpStatusCode.OK);
        var setupChallenge = await setup.Content.ReadFromJsonAsync<Challenge>();
        var setupCode = ReadTwoFactorCode(email, "Mã bật xác thực hai lớp AgriAI");
        var confirm = await _client.PostAsJsonAsync("/api/auth/two-factor/setup/verify",
            new { setupChallenge!.ChallengeId, code = setupCode });
        confirm.StatusCode.Should().Be(HttpStatusCode.NoContent);
        _inbox.Read(email, "Đã bật xác thực hai yếu tố AgriAI").Should().ContainSingle();
        var status = await _client.GetAsync("/api/auth/two-factor");
        status.StatusCode.Should().Be(HttpStatusCode.OK);
        (await status.Content.ReadFromJsonAsync<TwoFactorStatus>())!.Enabled.Should().BeTrue();
        _client.DefaultRequestHeaders.Authorization = null;

        var login = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, "Password123!"));
        login.StatusCode.Should().Be(HttpStatusCode.Accepted);
        (await login.Content.ReadAsStringAsync()).Should().NotContain("\"token\"");
        _inbox.Read(email, "Thông báo đăng nhập AgriAI").Should().BeEmpty();
        var challenge = await login.Content.ReadFromJsonAsync<Challenge>();
        var code = ReadTwoFactorCode(email, "Mã đăng nhập AgriAI");

        var verify = await _client.PostAsJsonAsync("/api/auth/two-factor/login", new { challenge!.ChallengeId, code });
        verify.StatusCode.Should().Be(HttpStatusCode.OK);
        var sessionAfterLogin = (await verify.Content.ReadFromJsonAsync<AuthResponse>())!;
        sessionAfterLogin.Token.Should().NotBeNullOrEmpty();
        _inbox.Read(email, "Thông báo đăng nhập AgriAI").Should().ContainSingle();
        var replay = await _client.PostAsJsonAsync("/api/auth/two-factor/login", new { challenge.ChallengeId, code });
        replay.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", sessionAfterLogin.Token);
        (await _client.GetAsync("/api/auth/me")).StatusCode.Should().Be(HttpStatusCode.OK);
        var disable = await _client.PostAsync("/api/auth/two-factor/setup?enabled=false", null);
        disable.StatusCode.Should().Be(HttpStatusCode.OK);
        var disableChallenge = (await disable.Content.ReadFromJsonAsync<Challenge>())!;
        var disableCode = ReadTwoFactorCode(email, "Mã tắt xác thực hai lớp AgriAI");
        var disableConfirm = await _client.PostAsJsonAsync("/api/auth/two-factor/setup/verify?enabled=false",
            new { disableChallenge.ChallengeId, code = disableCode });
        disableConfirm.StatusCode.Should().Be(HttpStatusCode.NoContent);
        _inbox.Read(email, "Đã tắt xác thực hai yếu tố AgriAI").Should().ContainSingle();
        _client.DefaultRequestHeaders.Authorization = null;

        var loginWithoutTwoFactor = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, "Password123!"));
        loginWithoutTwoFactor.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    private async Task<AuthResponse> RegisterAsync(string email)
    {
        var response = await _client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Integration User", email, "Password123!"));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
    }

    private string ReadTwoFactorCode(string email, string subject) =>
        Regex.Match(_inbox.Read(email, subject).Should().ContainSingle().Which, @"\b[0-9]{8}\b").Value;

    private sealed record Challenge(Guid ChallengeId);
    private sealed record TwoFactorStatus(bool Enabled);

    [Fact]
    public async Task TwoFactorSetup_ShouldRequireAuthentication()
    {
        var response = await _client.PostAsync("/api/auth/two-factor/setup", null);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ForgotPassword_ShouldAcceptUnknownEmail()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/forgot-password",
            new { email = $"unknown_{Guid.NewGuid()}@example.com" });

        response.StatusCode.Should().Be(HttpStatusCode.Accepted, await response.Content.ReadAsStringAsync());
    }

    [Fact]
    [Trait("ApiCase", "auth.google.invalid")]
    public async Task GoogleLogin_ShouldRejectMalformedCredential()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/google", new { credential = "invalid-token" });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Trait("ApiCase", "existing.AuthControllerTests.RegisterAndLogin_ShouldSucceed_WhenValidDataProvided")]
    [Fact]
    public async Task RegisterAndLogin_ShouldSucceed_WhenValidDataProvided()
    {
        // Arrange
        var email = $"integration_{Guid.NewGuid()}@example.com";
        var registerRequest = new RegisterRequest("Integration User", email, "Password123!");

        // Act - Register
        var registerResponse = await _client.PostAsJsonAsync("/api/auth/register", registerRequest);

        // Assert - Register
        registerResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var registerResult = await registerResponse.Content.ReadFromJsonAsync<AuthResponse>();
        registerResult.Should().NotBeNull();
        registerResult!.Token.Should().NotBeNullOrEmpty();
        registerResult.User.Email.Should().Be(email);

        // Act - Login
        var loginRequest = new LoginRequest(email, "Password123!");
        var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);

        // Assert - Login
        loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var loginResult = await loginResponse.Content.ReadFromJsonAsync<AuthResponse>();
        loginResult.Should().NotBeNull();
        loginResult!.Token.Should().NotBeNullOrEmpty();
        loginResult.User.Email.Should().Be(email);
        _inbox.Read(email, "Thông báo đăng nhập AgriAI").Should().ContainSingle();
    }
}
