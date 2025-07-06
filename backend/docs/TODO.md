1. Table translation doesn't work if table is think-cell. In python-pptx it's recognized as Graphframe. May use OCR instead for those tables.
2. Texts in SmartArt can't be translated as for now. Tried vibe coding but doesn't work.
3. Bullet points in text boxes, if line break, in the translated pptx it shows bullet point with empty line. This isn't desired.
4. For bold / italic / underscore texts, since they affect text length, now we just used a simple scaler, but to be exact we should import the font and measure the difference in order to determine the correct font size.
5. For partially bold content, right now everything becomes bold in that text box.
6. For text color, problem still exists where translated text doesn't match original text's color
7. PPT files are not supported yet.
8. Count of total characters used is not implemented yet.
9. The progress bar is unevenly progressed and stuck at 90% for majority of time.

Details
1. Make all APIs in front-end together in a single file
2. Make all language list together in a single file so one-click to add a new language
3. The time shown in the referral code list isn't accurate, it's showing 8 hours behind
