You are setting up Dyrected on this project.

You will manage this entire process yourself.

Work in strict stages. Do not move to the next stage until you have explicit approval from me.

Only ask plain-language questions. Never ask me to make a technical decision.

Never invent content, pages, sections, collections, fields, features, routes, images, blog posts, interactive flows, or behaviour that do not already exist in this project.

Preserve the current design, layout, styling, components, routes, content order, visual hierarchy, animations, responsive behaviour, and application behaviour exactly as they are throughout every stage.

Do not redesign the website.

Do not rewrite unrelated code.

Do not improve copy unless I explicitly ask.

Do not add new features.

Do not remove existing features.

Do not extract something merely because it is a string.

Your goal is to make the existing website content manageable in Dyrected without changing how the website looks or works.

For the longer operating rules, stage behavior, content architecture defaults, batching guidance, and final verification bar, read and follow this page:

https://docs.dyrected.com/new-docs/quick-start-guides/coding-agents-and-ai-app-builders/using-the-dyrected-prompt

Before using any Dyrected feature, read the relevant current docs and the installed package types. Start with:

- https://docs.dyrected.com/llms.txt
- https://docs.dyrected.com
- https://docs.dyrected.com/new-docs/basics/fields/overview
- https://docs.dyrected.com/new-docs/basics/configuration/overview
- https://docs.dyrected.com/new-docs/features/upload/storage-adapters
- https://docs.dyrected.com/docs/admin/overview

Use only APIs supported by the installed version and current documentation. If the documentation and installed package differ, explain the mismatch in plain language and use the installed package as the source of truth. Do not invent Dyrected functions, configuration options, hooks, field types, access rules, storage options, preview handlers, or package APIs.

---

# Staged Workflow

## STAGE 1 — INSPECT

Before changing any files, inspect the current site and present a short checklist of editable areas in plain language.

- Identify what the owner can reasonably change without changing the design.
- Classify each item as `Global`, `Collection`, or `Page Section`.
- Classify whether editors will `Edit`, `Add/Remove`, or `Arrange`.
- Do not discuss schemas, databases, field types, or technical implementation details.
- Do not change any files in Stage 1.

Then end with this exact line:

WAITING — Does this list look right? Tell me anything to add, remove, or change. Say "approved" to continue.

Do not proceed until I say "approved."

---

## STAGE 2 — SEPARATE

After I approve the content list:

- Move only the approved content into structured local data first where needed.
- Do not connect Dyrected yet if safe local separation still needs to happen first.
- Keep runtime logic in code.
- Keep the site looking and behaving the same.
- Run the project's available validation commands and fix errors before continuing.

Then end with this exact line:

WAITING — Does the website still look and behave exactly as before? Say "approved" to continue, or describe anything that looks wrong.

Do not proceed until I say "approved."

---

## STAGE 3 — PLAN

After I approve Stage 2:

- Present the editing plan in plain language.
- State what becomes a `Global`, `Collection`, or reusable page section.
- State what editors can edit, add/remove, or arrange.
- State which routable content should support preview and which existing content should seed initial data.
- Do not show raw config or code.

End Stage 3 with this exact line:

WAITING — Does this plan match what your client should be able to manage? Correct anything missing or unnecessary, then say "approved" to continue.

Do not proceed until I say "approved."

---

## STAGE 4 — INSTALL

After I approve Stage 3:

Ask me for the following in one message:

- Site ID
- Site API key
- Base URL

Wait for my reply.

Then proceed.

- Install and connect Dyrected in small verified batches.
- Make Dyrected the real source of truth for approved content.
- Preserve the current routes, design, and behavior.
- Only add hooks for approved client-visible behavior.
- Add safe fallbacks, loading, and error handling where needed.
- Keep private credentials out of browser code.

End Stage 4 with a plain-language summary of what is now editable, what is protected, what previews were configured, what routes now read from Dyrected, and which checks were run.

Then end with this exact line:

WAITING — Open the editor and change one piece of content. Confirm it appears on the website, then say "approved" to continue. If something looks wrong, describe what you changed and what you see.

Do not proceed until I say "approved."

---

## STAGE 5 — HANDOFF

After I approve Stage 4:

Confirm the setup is complete.

Remind me to:

1. Publish normally through my existing host or deploy tool.
2. Invite the client as an Editor in Dyrected under Settings → Team → Invite.
3. Test their account before sending the login.
4. Test one page preview.
5. Test one content edit before sending the login.
6. Test one content-driven feature edit if one was included.

Provide a short handoff message I can send to the client.

The handoff message must be written in plain language.

It should explain:

- What the client can edit
- What the client can add or remove
- Which page sections they can reuse
- Which section styles or variants are available
- Which images they can replace
- Which long-form content they can edit
- Which interactive feature content they can manage, if any
- That they can preview pages before publishing where preview is available
- That design and layout changes outside the approved section system still come through me
- That behaviour changes, scoring logic, submissions, dashboards, and user data are separate from content editing unless already included
- That they should ask before deleting important content
- How to access the editor

Do not include technical setup details in the client handoff message.

End with:

COMPLETE — The handoff is ready.
