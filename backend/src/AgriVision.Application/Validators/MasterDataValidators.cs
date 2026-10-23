using AgriVision.Application.DTOs.Disease;
using AgriVision.Application.DTOs.Plant;
using FluentValidation;

namespace AgriVision.Application.Validators;

public class CreatePlantRequestValidator : AbstractValidator<CreatePlantRequest>
{
    public CreatePlantRequestValidator()
    {
        RuleFor(x => x.VietnameseName).MaximumLength(150);
        RuleFor(x => x.ScientificName).MaximumLength(200);
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Plant name is required.")
            .MaximumLength(100).WithMessage("Plant name must not exceed 100 characters.");
    }
}

public class CreateDiseaseRequestValidator : AbstractValidator<CreateDiseaseRequest>
{
    public CreateDiseaseRequestValidator()
    {
        RuleFor(x => x.VietnameseName).MaximumLength(200);
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Disease name is required.")
            .MaximumLength(100).WithMessage("Disease name must not exceed 100 characters.");
    }
}

public class UpdatePlantRequestValidator : AbstractValidator<UpdatePlantRequest>
{
    public UpdatePlantRequestValidator()
    {
        RuleFor(x => x.VietnameseName).MaximumLength(150);
        RuleFor(x => x.ScientificName).MaximumLength(200);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
    }
}

public class UpdateDiseaseRequestValidator : AbstractValidator<UpdateDiseaseRequest>
{
    public UpdateDiseaseRequestValidator()
    {
        RuleFor(x => x.VietnameseName).MaximumLength(200);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
    }
}
