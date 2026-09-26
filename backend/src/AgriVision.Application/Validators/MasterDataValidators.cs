using AgriVision.Application.DTOs.Disease;
using AgriVision.Application.DTOs.Plant;
using FluentValidation;

namespace AgriVision.Application.Validators;

public class CreatePlantRequestValidator : AbstractValidator<CreatePlantRequest>
{
    public CreatePlantRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Plant name is required.")
            .MaximumLength(100).WithMessage("Plant name must not exceed 100 characters.");
    }
}

public class CreateDiseaseRequestValidator : AbstractValidator<CreateDiseaseRequest>
{
    public CreateDiseaseRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Disease name is required.")
            .MaximumLength(100).WithMessage("Disease name must not exceed 100 characters.");
    }
}
