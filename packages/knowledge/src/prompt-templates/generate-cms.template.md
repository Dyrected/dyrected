You are setting up Dyrected on this existing project.

Manage the integration from inspection through handoff. Work in strict stages
and do not move to the next stage until I explicitly approve the current one.

Follow this contract throughout the work:

<!-- GENERATED:INTEGRATION_CONTRACT:START -->
<!-- GENERATED:INTEGRATION_CONTRACT:END -->

# Staged Workflow

## STAGE 1 - INSPECT

Do not change files.

Inspect the complete project, including its framework, package manager, routes,
components, content sources, public pages, media, interactive features,
environment setup, and any existing Dyrected installation.

Present a short plain-language checklist of content a non-technical owner could
reasonably manage without changing the design or behaviour.

For each item, state:

- whether it is `Global`, `Collection`, or `Page Section`
- whether editors can `Edit`, `Add/Remove`, or `Arrange`
- whether it has replaceable images, long-form content, or an existing public
  route that should support preview

Do not discuss schemas, databases, field types, adapters, hooks, or technical
implementation.

End with this exact line:

WAITING - Does this list look right? Tell me anything to add, remove, or change. Say "approved" to continue.

Do not proceed until I say "approved."

---

## STAGE 2 - SEPARATE

After I approve the content list, prepare only the approved content for a safe
migration.

- Move content into structured local data only when an intermediate separation
  is necessary to preserve behaviour or make the migration verifiable.
- Do not refactor content that can be connected safely without that step.
- Keep runtime logic, state, event handlers, calculations, validation,
  animation, authentication, and submissions in code.
- Use serializable local content shapes. Store stable names for icons,
  components, and variants instead of executable values.
- Preserve rich content, media references, content order, and the current
  interface.
- Run the project's available validation commands and fix regressions caused by
  this stage.

End with this exact line:

WAITING - Does the website still look and behave exactly as before? Say "approved" to continue, or describe anything that looks wrong.

Do not proceed until I say "approved."

---

## STAGE 3 - PLAN

After I approve Stage 2, present the editing plan in plain language.

State:

- what becomes a shared `Global`
- what becomes a repeatable `Collection`
- which existing public pages become page entries
- which visible sections become reusable page-section blocks
- which existing section variants editors may choose
- what editors may edit, add/remove, arrange, hide, preview, or publish
- which images and long-form content become editable
- which interactive definitions become editable and which behaviour remains
  protected in code
- which existing content seeds the initial data
- which existing routes support preview
- whether editors can create new pages and, if so, how those pages appear on
  the existing site

Use names from the project. Do not invent generic collections or page types.
Do not show raw config, field definitions, or code.

End with this exact line:

WAITING - Does this plan match what your client should be able to manage? Correct anything missing or unnecessary, then say "approved" to continue.

Do not proceed until I say "approved."

---

## STAGE 4 - INSTALL

After I approve Stage 3:

{{DYRECTED_INSTALL_REQUIREMENTS}}

Then complete the integration in batches of no more than three related content
areas.

- Use the official CLI initialization flow when Dyrected is absent. For agent
  automation, pass non-interactive `dyrected init` options from the installed
  CLI instead of bypassing setup because the default command can prompt.
- Complete existing generated setup when Dyrected is partially installed.
- Read the current docs and installed package types before each Dyrected feature.
- Define only the approved globals, collections, blocks, variants, fields,
  validation, access, workflows, and previews.
- Use dedicated `define[FieldName]Field` helpers and `defineBlock`.
- Use `defineRichTextField` for formatted blog, article, policy, case-study, and
  other long-form bodies. Do not put Markdown in a textarea field.
- Give every collection and global a valid, semantically appropriate Lucide
  `admin.icon` name.
- Seed only approved existing content without overwriting populated data.
- Make Dyrected the real runtime source for each completed content area.
- Preserve the existing routes, components, design, and behaviour.
- For previewable pages, prefer postMessage live preview: server-fetch the
  published data, pass it into a hydrated component, and use the installed
  `useLivePreview` helper to overlay draft data.
- Render ordered page sections with the installed blocks renderer and installed
  field-path helpers when available; do not hand-build block indexes or preview
  path strings.
- Add safe loading, empty, error, and fallback handling.
- Keep private credentials and non-serializable values out of browser data.
- Generate types and validate the local schema before schema synchronization.
- Before synchronization, report any change that could affect stored content.

For each batch, run the project's available generation, schema validation,
lint, type-check, focused test, and build commands. Fix failures before adding
another batch. After the final batch, synchronize the schema and verify the
embedded Admin, public routes, preview routes, and one real edit end to end.

If a check cannot run, explain the exact environmental limitation and use the
next-best available verification.

Summarize what is editable, addable, removable, arrangeable, previewable, and
protected; which routes read from Dyrected; and which checks passed.

End with this exact line:

WAITING - Open the editor and change one piece of content. Confirm it appears on the website, then say "approved" to continue. If something looks wrong, describe what you changed and what you see.

Do not proceed until I say "approved."

---

## STAGE 5 - HANDOFF

After I approve Stage 4, confirm the setup is complete.

Remind me to:

1. Publish through the existing host or deployment tool.
2. Invite the client as an Editor under Settings > Team > Invite.
3. Test the client's account before sending the login.
4. Test one available page preview.
5. Test one normal content edit.
6. Test one content-driven feature edit if one was included.

Provide a short client handoff message in plain language. Explain:

- what the client can edit
- what the client can add, remove, hide, or arrange
- which page sections and approved variants they can use
- which images and long-form content they can replace or edit
- which interactive content definitions they can manage
- where preview is available
- how to access the editor
- that design, layout, and unsupported section changes still come through the
  developer
- that behaviour, scoring, submissions, dashboards, authentication, and user
  data remain separate unless explicitly included
- that important content should not be deleted without checking first

Do not include technical setup details in the client message.

End exactly with:

COMPLETE - The handoff is ready.
