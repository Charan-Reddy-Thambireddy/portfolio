public sealed class CaseServiceTests
{
    private readonly CareBridgeDbContext _db = new(
        new DbContextOptionsBuilder<CareBridgeDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private readonly FakeAuditLog _audit = new();

    private CaseService CreateSut() => new(
        _db,
        _audit,
        new FakeCurrentUser("demo.caseworker"),
        new FakeTimeProvider(new DateTimeOffset(2026, 3, 10, 14, 0, 0, TimeSpan.Zero)));

    private async Task SeedPendingAsync(AuthorizationStatus status = AuthorizationStatus.Pending)
    {
        _db.ServiceAuthorizations.Add(new ServiceAuthorization
        {
            Id = 7, CaseRecordId = 2, ServiceCode = "HDM", Status = status
        });
        await _db.SaveChangesAsync();
    }

    [Fact]
    public async Task Deny_records_trimmed_reason_reviewer_and_audit_entry()
    {
        await SeedPendingAsync();

        var outcome = await CreateSut().DecideAuthorizationAsync(2, 7,
            new AuthorizationDecisionRequest
            {
                Decision = AuthorizationStatus.Denied,
                Reason = "  Needs are met by adult day health.  "
            },
            CancellationToken.None);

        Assert.Equal(DecisionResultKind.Success, outcome.Kind);
        var saved = await _db.ServiceAuthorizations.SingleAsync(a => a.Id == 7);
        Assert.Equal(AuthorizationStatus.Denied, saved.Status);
        Assert.Equal("Needs are met by adult day health.", saved.DecisionReason);
        Assert.Equal("demo.caseworker", saved.DecidedBy);

        var entry = Assert.Single(_audit.Entries);
        Assert.Equal("AuthorizationDenied", entry.Action);
        Assert.Equal("Case 2; service HDM", entry.Details); // IDs only, never PII
    }

    [Theory]
    [InlineData(AuthorizationStatus.Approved)]
    [InlineData(AuthorizationStatus.Denied)]
    public async Task Already_decided_authorization_is_left_unchanged(AuthorizationStatus existing)
    {
        await SeedPendingAsync(existing);

        var outcome = await CreateSut().DecideAuthorizationAsync(2, 7,
            new AuthorizationDecisionRequest { Decision = AuthorizationStatus.Approved },
            CancellationToken.None);

        Assert.Equal(DecisionResultKind.AlreadyDecided, outcome.Kind);
        Assert.Empty(_audit.Entries);
    }

    [Fact]
    public async Task Authorization_on_a_different_case_is_not_found()
    {
        await SeedPendingAsync();

        var outcome = await CreateSut().DecideAuthorizationAsync(99, 7,
            new AuthorizationDecisionRequest { Decision = AuthorizationStatus.Approved },
            CancellationToken.None);

        Assert.Equal(DecisionResultKind.NotFound, outcome.Kind);
    }

    [Fact]
    public void Denial_without_a_reason_fails_model_validation()
    {
        var form = new DecisionFormModel { Decision = AuthorizationStatus.Denied, Reason = " " };
        var results = new List<ValidationResult>();

        var valid = Validator.TryValidateObject(form, new ValidationContext(form), results, validateAllProperties: true);

        Assert.False(valid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(DecisionFormModel.Reason)));
    }
}
