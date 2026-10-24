using AgriVision.API.Middleware;
using AgriVision.Application.DTOs.Auth;
using AgriVision.Application.Validators;
using FluentAssertions;
using FluentValidation;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace AgriVision.UnitTests.Services;

public class RequestValidationFilterTests
{
    [Fact]
    public async Task RequestWithoutDeclaredValidator_IsNotRejectedByGenericFilter()
    {
        using var services = new ServiceCollection().BuildServiceProvider();
        var http = new DefaultHttpContext { RequestServices = services };
        var action = new ActionContext(http, new RouteData(), new ActionDescriptor(), new ModelStateDictionary());
        var context = new ActionExecutingContext(action, [], new Dictionary<string, object?> { ["id"] = Guid.NewGuid(), ["optional"] = null }, new object());
        var calls = 0;
        await new RequestValidationFilter().OnActionExecutionAsync(context, () =>
        {
            calls++;
            return Task.FromResult(new ActionExecutedContext(action, [], new object()));
        });
        calls.Should().Be(1);
    }

    [Fact]
    public async Task AbortedRequest_DoesNotContinueIntoAction()
    {
        using var services = new ServiceCollection().AddScoped<IValidator<RegisterRequest>, RegisterRequestValidator>().BuildServiceProvider();
        using var canceled = new CancellationTokenSource();
        canceled.Cancel();
        var http = new DefaultHttpContext { RequestServices = services, RequestAborted = canceled.Token };
        var action = new ActionContext(http, new RouteData(), new ActionDescriptor(), new ModelStateDictionary());
        var context = new ActionExecutingContext(action, [], new Dictionary<string, object?> { ["request"] = new RegisterRequest("Farmer", "fixture@example.test", "123456") }, new object());
        var called = false;
        Func<Task> invoke = () => new RequestValidationFilter().OnActionExecutionAsync(context, () =>
        {
            called = true;
            return Task.FromResult(new ActionExecutedContext(action, [], new object()));
        });
        await invoke.Should().ThrowAsync<OperationCanceledException>();
        called.Should().BeFalse();
    }

    [Fact]
    public async Task InvalidRequest_StopsActionAndReturnsDeclaredFieldFailures()
    {
        using var services = new ServiceCollection().AddScoped<IValidator<RegisterRequest>, RegisterRequestValidator>().BuildServiceProvider();
        var http = new DefaultHttpContext { RequestServices = services };
        var action = new ActionContext(http, new RouteData(), new ActionDescriptor(), new ModelStateDictionary());
        var context = new ActionExecutingContext(action, [], new Dictionary<string, object?> { ["request"] = new RegisterRequest("Farmer", "invalid-email", "12345") }, new object());
        var called = false;
        Func<Task> invoke = () => new RequestValidationFilter().OnActionExecutionAsync(context, () =>
        {
            called = true;
            return Task.FromResult(new ActionExecutedContext(action, [], new object()));
        });
        var exception = await invoke.Should().ThrowAsync<ValidationException>();
        exception.Which.Errors.Select(error => error.PropertyName).Should().Contain(["Email", "Password"]);
        called.Should().BeFalse();
    }

    [Fact]
    public async Task ValidRequest_ExecutesActionExactlyOnce()
    {
        using var services = new ServiceCollection().AddScoped<IValidator<RegisterRequest>, RegisterRequestValidator>().BuildServiceProvider();
        var http = new DefaultHttpContext { RequestServices = services };
        var action = new ActionContext(http, new RouteData(), new ActionDescriptor(), new ModelStateDictionary());
        var context = new ActionExecutingContext(action, [], new Dictionary<string, object?> { ["request"] = new RegisterRequest("Farmer", "fixture@example.test", "123456") }, new object());
        var calls = 0;
        await new RequestValidationFilter().OnActionExecutionAsync(context, () =>
        {
            calls++;
            return Task.FromResult(new ActionExecutedContext(action, [], new object()));
        });
        calls.Should().Be(1);
    }
}
