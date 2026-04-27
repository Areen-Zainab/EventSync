# From MVP to User Evidence
## Validation, Testing, and Early Signals (Phase 4)

> Note: This is mock data for drafting and presentation practice only.

## Purpose of Phase 4
We built an MVP and tested whether it works for real behavior, not just opinions.

Core question:

**Does this product actually work for real users?**

This phase focuses on observed usage evidence.

---

## Part A - User Testing and Evidence Collection

### Objective
Generate behavioral evidence from users interacting with EventSync MVP.

### Test Setup
- Users tested: 10 (existing app users)
- Session format: Moderated usability sessions (remote + in-person)
- Session length: 25 to 40 minutes
- Date range: April 19 to April 24, 2026
- Tested modules: Signup/Login, Events, Tasks, Team page, Chat, Notifications, Event edit flow

### Target Segment Fit (10/10)
| User ID | Segment Match | Role/Background | Why Included |
|---|---|---|---|
| U1 | High | Final-year CS student, team lead | Plans group projects weekly |
| U2 | High | Student society coordinator | Manages events with volunteers |
| U3 | Medium | Freelance designer | Uses lightweight tools for task tracking |
| U4 | High | CS student, project manager in FYP team | Heavy collaboration needs |
| U5 | High | Startup intern | Coordinates deadlines with small team |
| U6 | Medium | Content creator | Tracks campaigns and reminders |
| U7 | High | Engineering student | Uses calendar + task stack daily |
| U8 | High | Community organizer | Manages recurring meetup tasks |
| U9 | Medium | Junior developer | New to team planning tools |
| U10 | High | Student club president | Oversees team schedules and event changes |

---

## Structured Session Design

### A) Context Questions Asked
- What do you currently use for event and task management?
- What problem are you trying to solve faster?

### B) Task-Based Testing (No Guidance)
Each user completed these core tasks:
1. Create an event and assign due-date-based tasks.
2. Invite teammates or navigate to Team/Chat for coordination.
3. Edit event details and verify update visibility.
4. Check notifications and identify pending deadlines.

### C) Observation Criteria
- Hesitation points
- Confusion points
- Easy-success moments

### D) Reflection Questions
- What was useful?
- What was confusing?
- Would you use this again?
- Would you pay? Why/why not?

---

## Behavioral Evidence Summary (All 10 Users)

### Task Completion and Assistance
| Task | Success Without Help | Success With Hint | Failed | Avg Time |
|---|---:|---:|---:|---:|
| Signup/Login and reach dashboard | 10 | 0 | 0 | 1m 20s |
| Create event + add task | 8 | 2 | 0 | 3m 45s |
| Find Team + open Chat | 6 | 3 | 1 | 4m 10s |
| Edit existing event | 5 | 4 | 1 | 5m 05s |
| Find and interpret Notifications | 7 | 2 | 1 | 3m 30s |

### Where Users Spent Most Time
1. Event edit flow (average 5m 05s)
2. Team/Chat discovery from dashboard (average 4m 10s)
3. Event creation with task linking (average 3m 45s)

### Most Difficult Feature to Find
- **Most difficult:** Event edit entry point (Users expected a visible Edit button on event detail header).
- **Second most difficult:** Team/Chat entry path (Users expected one-click chat from event card).
- **Third most difficult:** Notification state meaning (read vs actionable reminder).

---

## Per-User Evidence (Condensed)

### U1
- Context: Uses Google Calendar + WhatsApp groups.
- Behavior: Completed all tasks; paused 25s finding event edit.
- Quote: "Everything is clean, but edit should be more obvious."
- Reuse: Yes. Payment: Maybe, if team adoption is high.

### U2
- Context: Uses Trello + phone reminders.
- Behavior: Needed 1 hint to locate Team page.
- Quote: "I expected chat inside event directly."
- Reuse: Yes. Payment: Yes for admin controls.

### U3
- Context: Uses Notion manually.
- Behavior: Failed first attempt at notification interpretation.
- Quote: "I saw a bell, but not sure what needs action now."
- Reuse: Maybe. Payment: No (yet).

### U4
- Context: Uses Jira for coursework.
- Behavior: Fast event/task creation, slow edit discovery.
- Quote: "Task creation is smooth, edit path is hidden."
- Reuse: Yes. Payment: Yes for analytics.

### U5
- Context: Uses Google Sheets + Slack.
- Behavior: Needed hint for chat navigation.
- Quote: "I want quick team communication from event screen."
- Reuse: Yes. Payment: Maybe.

### U6
- Context: Uses calendar + sticky notes.
- Behavior: Completed all flows, but paused on notification details.
- Quote: "Reminder is good, but urgency level is unclear."
- Reuse: Yes. Payment: Maybe.

### U7
- Context: Uses Asana.
- Behavior: One of fastest users; no hints.
- Quote: "Good for small teams, fewer clicks needed for edits."
- Reuse: Yes. Payment: Yes.

### U8
- Context: Uses Facebook groups + docs.
- Behavior: Failed first chat discovery attempt.
- Quote: "I did not know where team conversation starts."
- Reuse: Maybe. Payment: No (yet).

### U9
- Context: New to planning tools.
- Behavior: Slow across all tasks; 2 hints needed.
- Quote: "I can do tasks, but icons need clearer labels."
- Reuse: Maybe. Payment: No.

### U10
- Context: Uses ClickUp for club work.
- Behavior: Completed all tasks; asked for stronger notification filtering.
- Quote: "Useful, but I need to see urgent items first."
- Reuse: Yes. Payment: Yes.

---

## Qualitative Patterns

### What Users Did (Behavior)
- 8/10 created event and linked tasks without guidance.
- 5/10 searched multiple screens before finding event edit.
- 4/10 expected chat access directly from event detail.
- 3/10 opened notifications but were uncertain about next action.

### What Users Said (Selected Quotes)
- "I like the flow from event to tasks."
- "Editing should be visible, not hidden."
- "Chat is useful but hard to discover quickly."
- "Reminder exists, but priority is unclear."

### Expectation vs Reality Mismatches
| Assumption | Expected | Observed | Impact |
|---|---|---|---|
| Event edit is obvious | Users will find edit in <60s | Avg 5m+ with retries | High friction for returning users |
| Chat path is intuitive | Team communication discovered naturally | 40% needed hint/failure | Collaboration value delayed |
| Bell icon is enough | Users will know what is urgent | Users asked for urgency labels | Lower trust in reminders |

---

## SUS (Mock)
| User ID | SUS Score (0-100) | Notes |
|---|---:|---|
| U1 | 78 | Strong on core flow |
| U2 | 74 | Team navigation issue |
| U3 | 69 | Notification clarity issue |
| U4 | 76 | Edit discoverability issue |
| U5 | 72 | Chat entry friction |
| U6 | 75 | Good flow, reminder ambiguity |
| U7 | 82 | Power user, high confidence |
| U8 | 67 | Navigation uncertainty |
| U9 | 64 | Beginner friction |
| U10 | 79 | Wants urgent filters |

**Average SUS:** 73.6 (acceptable usability, but discoverability issues remain)

---

## Insights Summary

### What Works
- Core event + task creation flow is understandable for most users.
- Dashboard and initial onboarding are easy to complete.
- Users see practical value for team planning once they reach the right features.

### What Fails
- Event edit entry point is not discoverable enough.
- Team/Chat navigation is not obvious from event workflows.
- Notification priority/actionability is unclear.

### What Surprised Us
- Even confident users needed extra time on edit flow.
- Beginner users could still complete tasks when labels were clear.
- Interest in paying exists, but only after friction in discoverability is fixed.

### Assumptions That Were Wrong
- "If the feature exists, users will find it quickly."
- "One bell icon is enough for notification understanding."
- "Chat discovery is natural without direct in-context entry points."

---

## Deliverable

### Who We Tested With
10 active users matching target segment (students, team leads, coordinators, early professionals).

### Key Observations
- Users spent the **most time** in event editing and team/chat discovery.
- Most difficult feature to find was **Event Edit**.
- Strong value signal in planning workflows, but weak discoverability in collaboration and update flows.

### Top 3 Insights
1. If users cannot find edit quickly, they perceive the product as rigid.
2. Collaboration value depends on making Team/Chat visible from event context.
3. Notifications need urgency and next-action cues to drive trust and repeat usage.

### What Changed in Our Understanding
- We shifted from "feature completeness" to "feature discoverability" as the top priority.
- We now treat navigation clarity as a product outcome, not a UI detail.
- We will prioritize edit visibility, chat entry shortcuts, and notification urgency labels before adding new features.

---

## Immediate Next Actions (Post-Validation)
1. Add a primary Edit action on event detail header and event cards.
2. Add "Open Team Chat" CTA inside each event detail page.
3. Add notification tags: `Urgent`, `Today`, `Upcoming`, with clear action links.
4. Re-test with the same 10 users and compare completion time deltas.

---

## Evidence Checklist
- [x] 10 users tested (mock dataset)
- [x] Users resemble target segment
- [x] Sessions include context, tasks, observation, reflection
- [x] Behavioral evidence captured
- [x] Qualitative quotes captured
- [x] Expectation vs reality mismatches documented
- [x] Top 3 insights extracted
- [x] Clear update on what changed in understanding
