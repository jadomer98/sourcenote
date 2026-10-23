# Loom recording outline — German, target 8:30

Record only after the real deployed workflow passes. Maximum employer limit: **10 minutes**. This script is preparation, not a recorded video. Open a clean isolated workspace, the GitHub repo and the architecture page before recording; keep keys, private email and provider dashboards out of the capture.

| Time | Live action | German speaking cue |
| --- | --- | --- |
| 00:00–00:35 | Show deployed SourceNote home | „Ich habe SourceNote gebaut, einen NotebookLM-inspirierten Recherchebereich. Der Kern ist: Quellen sammeln, Fragen stellen und jede Antwort anhand der Originalauszüge prüfen.“ |
| 00:35–01:35 | Show ARCH-01 and ARCH-02 briefly | „Die Anwendung verwendet einen TypeScript-Stack. Notebooks, Texte und Originaldateien werden privat in PostgreSQL gespeichert. Jede Gast-Sitzung ist isoliert. Groq ist als kostenloser KI-Anbieter angebunden. Ich habe bewusst auf eine zusätzliche Vektordatenbank verzichtet, weil kleine Dokumente vollständig in den begrenzten Kontext passen.“ |
| 01:35–02:15 | Create notebook, upload short real PDF | „Ich lade eine echte Text-PDF hoch. Die Verarbeitung behält zuverlässige Seiteninformationen bei und zeigt Fehler klar an.“ Use own permitted short file; sample plain text is also in fixtures. |
| 02:15–03:15 | Add `demo-project.txt`, ask budget question, inspect citation | Ask: „Wie hoch ist das genehmigte Budget und wie setzt es sich zusammen?“ Click a reference, compare the 3,200/800/1,000 figures and total with the source. „Der Beleg kommt aus dem gespeicherten Quelltext, nicht aus einer von der KI erfundenen Seitenzahl.“ |
| 03:15–04:15 | Add meeting note, change selection | Ask about dashboard approval/budget. Show core 5,000 vs proposed 1,500 extension. Exclude meeting note, ask again. „Die Auswahl beschränkt neue Antworten. Ausgeschlossene Quellen werden nicht still über alte Chat-Antworten wieder eingebracht.“ Free-minute throttles may require waiting; explain them honestly. |
| 04:15–04:50 | Ask unsupported question | „Wie wird das Wetter morgen in Berlin?“ Expect limitation. „Wenn die Quellen etwas nicht hergeben, soll die Anwendung das sagen.“ |
| 04:50–05:45 | Save note, generate overview, reload | Open saved Studio content after reload and export Markdown if useful. Show narrow-screen tabs briefly. |
| 05:45–06:20 | Show recoverable failure | Upload empty/scanned or unsupported fixture, read the safe error, recover with a valid text source. Do not imply OCR support. |
| 06:20–07:25 | Show repository and test evidence | Show lib modules, schema composite FKs, tests and CI. Explain owner isolation, citation allow-lists and delete/generation race briefly. „Codex hat mich bei Entwurf, Implementierung und Tests unterstützt; geprüft habe ich die Ergebnisse mit automatisierten Abläufen und dem echten Deployment.“ Adjust this wording to actual personal review performed. |
| 07:25–08:30 | Explain limits and links | „Die Demo hat klare Freikontingente. Audio, OCR und Zusammenarbeit sind bewusst außerhalb des Umfangs. Mein nächster Schritt bei größeren Dokumenten wäre eine gemessene Retrieval-Erweiterung. Repository, Anwendung und dieses Video sind in der Antwort verlinkt.“ |

Before sending: check recording duration, sound, actual live provider behavior and reviewer access to the Loom URL. Replace the 8:30 plan with actual timing if needed. No private account login should be visible in the recording.
