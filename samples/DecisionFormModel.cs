public sealed class DecisionFormModel : IValidatableObject
{
    [Required(ErrorMessage = "Select approve or deny.")]
    public AuthorizationStatus? Decision { get; set; }

    [Display(Name = "Reason")]
    [StringLength(500, ErrorMessage = "The reason must be 500 characters or fewer.")]
    public string? Reason { get; set; }

    // Cross-field rule. jQuery mirrors it client-side through the "requiredif" adapter.
    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        if (Decision == AuthorizationStatus.Denied && string.IsNullOrWhiteSpace(Reason))
        {
            yield return new ValidationResult(
                "Enter a reason for the denial. It is included in the notice to the beneficiary.",
                new[] { nameof(Reason) });
        }
    }

    public AuthorizationDecisionRequest ToRequest() => new()
    {
        Decision = Decision,
        Reason = Reason
    };
}
