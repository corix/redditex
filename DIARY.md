# Project diary

Running log of milestones for the Redditizer write-up. All times are **Pacific Time (PT)** — PDT (`UTC-7`) when daylight saving is in effect, PST (`UTC-8`) otherwise.


| Timestamp (PT)      | Duration | Milestone                             | What was built                                                                                                                                                                                                                                                                              |
| ------------------- | -------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-16 11:06 PM | 52m      | Project setup and reference docs      | Started the project and a bare-bones web page. Imported Reddit’s official style guide, trimmed it for use, organized it under `/docs/`, and added a short scoring rubric (how “good” the writing is on clarity, tone, and similar dimensions).                                              |
| 2026-05-16 11:56 PM | 50m      | Working prototype (Google AI Studio)  | First usable version of the app: paste product copy in the browser, run an analysis, and get structured feedback—summary, rubric scores, flagged issues, and suggested rewrites—powered by Google’s AI. Includes setup instructions so the project can be run locally.                      |
| 2026-05-17 12:39 AM | 43m      | Screenshot text extraction and polish | Upload, paste, or drag screenshots to pull text into the review box—using AI vision for accurate reading, with basic OCR as a backup if API limits kick in. Fixed Google API setup and quota handling; refined the results UI (including suggested rewrites). Prototype working end-to-end. |


**Total (committed milestones):** 2h 25m, ~10pm to 1am

*Durations are estimates from Cursor prompts/sessions (Vite cleanup, style-guide trimming, rubric conversion, planning + full-stack build) and time between commits. They include active prompting and agent work, not idle time.*

---

*Add new rows at the bottom as you ship. Use `git log --reverse --format='%ci %s'` for commit times, or record manual milestones (e.g. first successful demo, deploy) with the local PT clock.*