1. Table translation doesn't work if table is think-cell. In python-pptx it's recognized as Graphframe. May use OCR instead for those tables.
2. Texts in SmartArt can't be translated as for now. Tried vibe coding but doesn't work.
3. Bullet points in text boxes, if line break, in the translated pptx it shows bullet point with empty line. This isn't desired.
4. For bold / italic / underscore texts, since they affect text length, now we just used a simple scaler, but to be exact we should import the font and measure the difference in order to determine the correct font size.
5. For partially bold content, right now everything becomes bold in that text box.
