# PawRang AI Progress Checklist

## Current Goal
- Build Phase 1 AI support for PawRang using OpenAI API.
- Use AI to support admin intake review, user symptom collection, and doctor EMR preparation.
- Switched paid AI generation path to OpenAI Responses API with structured JSON output.

## Phase 1 Scope
- Feature: `Admin AI Appointment Summary Assistant`
- Main screen: admin patient/appointment details view
- AI role:
  - summarize the case
  - identify important admin-facing flags
  - suggest follow-up questions
  - identify missing intake information
- AI must not:
  - diagnose
  - prescribe
  - replace veterinary judgment

## Completed
- [x] Chose Phase 1 AI direction for PawRang
- [x] Decided to use Gemini API as the main AI service
- [x] Defined Phase 1 as an admin-side AI feature
- [x] Selected `UserDetailsView` as the first AI screen
- [x] Added backend Gemini configuration via `.env`
- [x] Added backend helper for Gemini structured JSON output
- [x] Added backend endpoint: `/api/ai/admin-appointment-summary`
- [x] Added frontend API service method for AI summary generation
- [x] Added `Generate AI Summary` button in admin patient details
- [x] Added AI summary result panel in admin patient details
- [x] Confirmed the AI summary is working with a real Gemini API key
- [x] Refined the prompt to reduce repetition and be more service-aware
- [x] Added a note that the AI output is admin support only
- [x] Added `Regenerate AI Summary` action
- [x] Added `Copy Summary` action
- [x] Improved the AI panel styling for a cleaner presentation
- [x] Added loading and error states that look more polished

## User Symptom Intake Status
- [x] Decided to build the user-side AI next before doctor-side AI
- [x] Defined the booking flow to include a `Symptom Intake` step
- [x] Added symptom selection UI to the booking page
- [x] Added owner symptom notes and quick follow-up intake fields
- [x] Added Gemini endpoint: `/api/ai/symptom-summary`
- [x] Removed user-visible AI symptom summary from booking to keep the flow simple
- [x] Wired symptom intake payload into the medical information save request
- [x] Updated backend normalization to return saved symptom intake fields
- [x] Added SQL migration file for new symptom intake columns

## Doctor EMR AI Status
- [x] Merged updated EMR flow from `joseph-share-merged-system`
- [x] Added backend endpoint: `/api/ai/doctor-emr-brief`
- [x] Added doctor-specific AI prompt for EMR clinical prep support
- [x] Added frontend API service method for doctor EMR AI brief generation
- [x] Added doctor-only `Clinical Prep Brief` panel in Global EMR
- [x] Included visit history, clinical exam data, prescriptions, labs, services, and symptom intake in the doctor AI context
- [x] Added guardrails against diagnosis, prescription, and replacing veterinary judgment
- [x] Added doctor AI loading, error, collapse, and regenerate states
- [x] Added AI-generated support indicator with review-required reliability metadata
- [x] Expanded doctor EMR brief sections for relevant history, exam focus, owner questions, missing context, and care continuity

## In Progress / Immediate Next
- [ ] Run the Supabase SQL migration for `medical_information_symptom_intake.sql`
- [ ] Restart the backend after pulling the latest code
- [ ] Test symptom booking flow with consultation, boarding, and grooming services
- [ ] Verify saved symptom intake appears in admin-side appointment data
- [ ] Feed the new symptom fields into the admin AI summary output during testing
- [ ] Test the refined prompt on multiple appointment types
- [ ] Check grooming, boarding, consultation, and vaccination outputs
- [ ] Test doctor EMR AI with records that have symptom intake
- [ ] Test doctor EMR AI with records that have old visit history, prescriptions, and lab results
- [ ] Review whether the AI is too repetitive or too generic in some cases
- [ ] Decide whether to keep summaries on-demand only or save them

## Next Improvements
- [ ] Show clearer empty-state guidance when intake info is missing
- [ ] Add optional timestamps for when the summary was generated
- [ ] Show symptom intake details on the admin appointment view
- [x] Show symptom intake details inside EMR-related screens
- [ ] Decide whether symptom buttons should be filtered by species or service type
- [x] Improve Doctor EMR Brief content quality with stronger clinical-prep sections
- [x] Add SOAP note draft feature for doctor-reviewed documentation
- [ ] Manually test SOAP note draft with complete and incomplete visit details
- [x] Add clinical risk flags for allergies, medication use, appetite/drinking concerns, worsening symptoms, vaccine gaps, pregnancy status, and missing vitals
- [ ] Manually test clinical risk flags against complete and incomplete EMR visit data
- [x] Add follow-up and preventive reminder suggestions for vaccine due dates, prescriptions, labs, services, and symptom follow-up
- [ ] Manually test follow-up reminders with vaccine due dates and visits with prescriptions/labs
- [x] Add client-friendly care summary drafts for doctor-reviewed owner communication
- [ ] Manually test client care summaries before sharing/copying to owners
- [x] Add OpenAI API provider support for structured AI generation
- [ ] Add `OPENAI_API_KEY`, `AI_PROVIDER=openai`, and optional `OPENAI_MODEL=gpt-5-mini` to backend `.env`
- [ ] Restart backend and test all AI generation buttons through OpenAI

## Quality / Testing Checklist
- [ ] Test symptom booking with selected buttons only
- [ ] Test symptom booking with typed notes only
- [ ] Test symptom booking with both selected buttons and typed notes
- [ ] Test booking when no symptoms are reported
- [ ] Confirm fallback symptom summary appears if Gemini is unavailable
- [ ] Test appointment with full medical information
- [ ] Test appointment with missing medical information
- [ ] Test vague reason for visit
- [ ] Test clear reason for visit
- [ ] Test reschedule scenario
- [ ] Test walk-in scenario if available in the same flow
- [ ] Confirm no diagnosis language appears
- [ ] Confirm no treatment recommendation appears
- [ ] Confirm questions are useful and not repetitive
- [ ] Confirm errors are handled gracefully when API fails

## Thesis / Documentation Tasks
- [ ] Write the feature description for the thesis
- [ ] Write the system flow of the AI feature
- [ ] Explain why the AI is admin-support only in Phase 1
- [ ] Prepare screenshots of working AI summary output
- [ ] Document Gemini API as the external AI service used
- [ ] Document privacy/safety boundaries of the feature

## Possible Phase 2 Ideas
- [ ] Add AI summaries to EMR-related admin workflow
- [ ] Add preventive reminder AI based on vaccination and follow-up history
- [ ] Add AI drafting for admin-to-client follow-up messages
- [ ] Add doctor-facing AI support when doctor-side functionality exists

## Team Tracking Suggestions
- Owner 1: backend AI integration
- Owner 2: frontend AI panel and UX
- Owner 3: prompt testing and output review
- Owner 4: thesis documentation and screenshots

## Notes
- Gemini key should remain server-side in `backend/.env`
- Frontend should never contain the raw Gemini API key
- AI output must always be treated as support information, not final clinical judgment
