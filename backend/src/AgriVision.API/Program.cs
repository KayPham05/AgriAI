using System.Text;
using AgriVision.API.Middleware;
using AgriVision.Application;
using AgriVision.Infrastructure;
using AgriVision.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var migrateOnly = args.SequenceEqual(new[] { "--migrate" });
var expireImagesOnly = args.SequenceEqual(new[] { "--expire-images" });
var builder = WebApplication.CreateBuilder(migrateOnly || expireImagesOnly ? Array.Empty<string>() : args);

// The Windows Event Log provider can require elevated permissions and must not
// turn ordinary application warnings into request failures during local runs.
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

// 1. Add Application & Infrastructure Services
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

// 2. Configure Controllers & CORS
builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// 3. Configure JWT Authentication
var jwtSecret = builder.Configuration["JwtSettings:Secret"];
if (string.IsNullOrWhiteSpace(jwtSecret) || Encoding.UTF8.GetByteCount(jwtSecret) < 32)
{
    throw new InvalidOperationException("JwtSettings:Secret must be at least 32 UTF-8 bytes.");
}
var jwtIssuer = builder.Configuration["JwtSettings:Issuer"] ?? "AgriVisionAPI";
var jwtAudience = builder.Configuration["JwtSettings:Audience"] ?? "AgriVisionApp";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
    };
});

builder.Services.AddAuthorization();

// 4. Configure Swagger / OpenAPI with JWT Support
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "AgriVision AI API",
        Version = "v1",
        Description = "ASP.NET Core Web API for AgriVision AI Plant Leaf Disease Classification."
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter 'Bearer' [space] and then your valid JWT token.\r\n\r\nExample: \"Bearer eyJhbGciOiJIUzI1Ni...\""
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// The same published image applies migrations only when explicitly requested.
if (migrateOnly)
{
    await using var migrationScope = app.Services.CreateAsyncScope();
    var database = migrationScope.ServiceProvider.GetRequiredService<AppDbContext>();
    await database.Database.MigrateAsync();
    await DbInitializer.SeedAsync(migrationScope.ServiceProvider);
    app.Logger.LogInformation("Database migrations completed. No HTTP server was started.");
    await app.DisposeAsync();
    return;
}

if (expireImagesOnly)
{
    Environment.ExitCode = await ImageExpiryCleanup.RunAsync(app.Services);
    await app.DisposeAsync();
    return;
}

// 5. Global Exception Middleware
app.UseMiddleware<GlobalExceptionMiddleware>();

// 6. HTTP Pipeline
if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("Swagger:Enabled"))
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "AgriVision AI API v1"));
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/", () => Results.Redirect("/swagger"));

app.MapControllers();

// Normal startup checks schema readiness without changing schema or seeding data.
using (var scope = app.Services.CreateScope())
{
    var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if ((await database.Database.GetPendingMigrationsAsync()).Any())
    {
        throw new InvalidOperationException(
            "Database migrations are pending. Run 'docker compose run --rm --no-deps backend --migrate' before starting the backend.");
    }
}

app.Run();

// Partial class for WebApplicationFactory in Integration Tests
public partial class Program { }
