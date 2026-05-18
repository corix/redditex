# Project diary

<p class="changelog-note">All text on this page is machine generated.</p>

Running log of milestones for the Redditizer write-up. All times are **Pacific Time (PT)** — PDT (`UTC-7`) when daylight saving is in effect, PST (`UTC-8`) otherwise.


| Timestamp (PT)      | Duration | Milestone                             | What was built                                                                                                                                                                                                                                                                              |
| ------------------- | -------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-16 11:06 PM | 52m      | Project setup and reference docs      | Started the project and a bare-bones web page. Imported Reddit’s official style guide, trimmed it for use, organized it under `/docs/`, and added a short scoring rubric (how “good” the writing is on clarity, tone, and similar dimensions).                                              |
| 2026-05-16 11:56 PM | 50m      | Working prototype (Google AI Studio)  | First usable version of the app: paste product copy in the browser, run an analysis, and get structured feedback—summary, rubric scores, flagged issues, and suggested rewrites—powered by Google’s AI. Includes setup instructions so the project can be run locally.                      |
| 2026-05-17 12:39 AM | 43m      | Screenshot text extraction and polish | Upload, paste, or drag screenshots to pull text into the review box—using AI vision for accurate reading, with basic OCR as a backup if API limits kick in. Fixed Google API setup and quota handling; refined the results UI (including suggested rewrites). Prototype working end-to-end. |
| 2026-05-17 3:44 PM  | 4h 6m    | Exercises hub and Ghost Fees calculator | Reorganized into a small multi-page site (“Exercises for Reddit”) with a home directory. Moved Redditizer to `/redditizer`. Built **Ghost Fees**: an interactive calculator that compares Ghost and Substack take-home pay from audience size, paid subscribers, subscription price, and Ghost plan tier (Starter, Publisher, Business), including monthly vs annual billing and tiered pricing. |
| 2026-05-18 1:00 AM  | 9h       | UX audits — Patreon & Ghost (non-dev) | UX audits of Patreon and Ghost: captured screenshots, annotated them, proposed recommendations, and wrote up the report. No code shipped. |


**Total time** 15h 31m  
Sat, 5/16 — 10pm to 1am  
Sun, 5/17 — 12pm to 4pm  
Sun, 5/17 — 4pm to 1am

*Durations are estimates from Cursor prompts/sessions (Vite cleanup, style-guide trimming, rubric conversion, planning + full-stack build) and time between commits. They include active prompting and agent work, not idle time.*

---

*Add new rows at the bottom as you ship. Use `git log --reverse --format='%ci %s'` for commit times, or record manual milestones (e.g. first successful demo, deploy) with the local PT clock.*