# Hosted Codebase Map demo

`demo.html` is a generated AI Badger Codebase Map report, with a small
website-only installation link beside the header subtitle. This link belongs
only to the hosted example, not to the generic HTML generator or users' offline
reports.

When replacing `demo.html` with a regenerated report:

1. Preserve and reapply both blocks marked `BEGIN hosted-demo-only customization`
   and `END hosted-demo-only customization`: the CSS before `</style>` and the
   link beside the header subtitle.
2. Keep the link text `Map your own repo → Install CLI` and destination
   `/aibadger/install.html#cli`. Preserve `target="_blank"` and
   `rel="noopener noreferrer"` so installation opens in a new tab, including
   when the demo is embedded in the landing page.
3. Check that the link remains visible near the top, has a target at least 44px
   high, and causes no horizontal overflow at 414px and narrower widths.
4. Confirm search, folder exploration, and the theme toggle still work.

Keep these customizations in this website repository. Do not copy them into
AI Badger's report template.
