// wwwroot/js/case-queue.js (jQuery 3.7, jquery.validate and jquery.validate.unobtrusive)
$(function () {
  // 1. Client-side mirror of DecisionFormModel.Validate: a reason is required when denying.
  $.validator.addMethod("requiredif", function (value, element, params) {
    const chosen = $(element).closest("form").find(`input[name="${params.dependsOn}"]:checked`).val();
    return chosen !== params.value || $.trim(value).length > 0;
  });
  $.validator.unobtrusive.adapters.add("requiredif", ["dependson", "value"], function (options) {
    options.rules.requiredif = { dependsOn: options.params.dependson, value: options.params.value };
    options.messages.requiredif = options.message;
  });

  const $decision = $("#decision-form");

  // Re-check the reason when the decision changes, but only once an error is showing.
  $decision.on("change", 'input[name="Decision"]', function () {
    const $reason = $decision.find("#Reason");
    if ($reason.hasClass("input-validation-error")) {
      $reason.valid();
    }
  });

  // Unobtrusive validation fills the summary first; then move focus to it (WCAG 3.3.1).
  $decision.on("invalid-form.validate", function () {
    setTimeout(() => $("#decision-error-summary").trigger("focus"), 0);
  });

  $decision.on("input", "#Reason", function () {
    $("#reason-count").text(`You have ${500 - this.value.length} characters remaining`);
  });

  // 2. Queue filters: fetch the table partial with AJAX instead of reloading the page.
  $("#queue-filters").on("submit", function (event) {
    event.preventDefault();
    const $form = $(this);
    const $table = $("#case-table").attr("aria-busy", "true");
    const query = $form.serialize();

    $.ajax({ url: $form.attr("action"), data: query, cache: false })
      .done(function (html) {
        $table.html(html);
        history.replaceState(null, "", `${$form.attr("action")}?${query}`);
        // Polite live region: "Showing 1 to 10 of 24 cases, sorted by beneficiary."
        $("#queue-status").text($table.find("[data-result-summary]").text());
      })
      .fail(function () {
        $("#queue-status").text("Cases could not be loaded. Try again.");
      })
      .always(function () {
        $table.attr("aria-busy", "false");
      });
  });
});
