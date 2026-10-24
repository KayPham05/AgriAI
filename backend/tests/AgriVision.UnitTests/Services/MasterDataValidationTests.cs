using AgriVision.Application;
using AgriVision.Application.DTOs.Plant;
using AgriVision.Application.DTOs.Disease;
using FluentAssertions;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace AgriVision.UnitTests.Services;

public class MasterDataValidationTests
{
    [Theory]
    [InlineData("vietnamese", 150, true)]
    [InlineData("vietnamese", 151, false)]
    [InlineData("scientific", 200, true)]
    [InlineData("scientific", 201, false)]
    public async Task PlantOptionalFields_RespectDatabaseBoundariesOnCreateAndUpdate(string field, int length, bool valid)
    {
        using var services = new ServiceCollection().AddApplicationServices().BuildServiceProvider();
        var vietnamese = field == "vietnamese" ? new string('a', length) : null;
        var scientific = field == "scientific" ? new string('a', length) : null;
        var create = await services.GetRequiredService<IValidator<CreatePlantRequest>>().ValidateAsync(new("Plant", vietnamese, scientific, null));
        var update = await services.GetRequiredService<IValidator<UpdatePlantRequest>>().ValidateAsync(new("Plant", vietnamese, scientific, null, true));
        create.IsValid.Should().Be(valid);
        update.IsValid.Should().Be(valid);
    }

    [Theory]
    [InlineData(200, true)]
    [InlineData(201, false)]
    public async Task DiseaseOptionalName_RespectsDatabaseBoundaryOnCreateAndUpdate(int length, bool valid)
    {
        using var services = new ServiceCollection().AddApplicationServices().BuildServiceProvider();
        var value = new string('a', length);
        var create = await services.GetRequiredService<IValidator<CreateDiseaseRequest>>().ValidateAsync(new("Disease", value, null, null, null, null));
        var update = await services.GetRequiredService<IValidator<UpdateDiseaseRequest>>().ValidateAsync(new("Disease", value, null, null, null, null, true));
        create.IsValid.Should().Be(valid);
        update.IsValid.Should().Be(valid);
    }

    [Theory]
    [InlineData(0, false)]
    [InlineData(100, true)]
    [InlineData(101, false)]
    public async Task PlantUpdate_UsesSameNameBoundaryAsCreate(int length, bool valid)
    {
        using var services = new ServiceCollection().AddApplicationServices().BuildServiceProvider();
        var validator = services.GetService<IValidator<UpdatePlantRequest>>();
        validator.Should().NotBeNull("HTTP updates must have a registered validator");
        var result = await validator!.ValidateAsync(new UpdatePlantRequest(new string('a', length), null, null, null, true));
        result.IsValid.Should().Be(valid);
    }

    [Theory]
    [InlineData(0, false)]
    [InlineData(100, true)]
    [InlineData(101, false)]
    public async Task DiseaseUpdate_UsesSameNameBoundaryAsCreate(int length, bool valid)
    {
        using var services = new ServiceCollection().AddApplicationServices().BuildServiceProvider();
        var validator = services.GetService<IValidator<UpdateDiseaseRequest>>();
        validator.Should().NotBeNull("HTTP updates must have a registered validator");
        var result = await validator!.ValidateAsync(new UpdateDiseaseRequest(new string('a', length), null, null, null, null, null, true));
        result.IsValid.Should().Be(valid);
    }
}
