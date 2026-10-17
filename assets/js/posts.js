/* ==========================================================================
   ENGINEERING JOURNAL — all entries live in this file.

   To add an entry, copy the block below and paste it at the TOP of the list.
   Order does not matter: entries are sorted by `date`, newest first.

   {
     slug:    'short-url-friendly-name',      // unique; used in the link blog.html#/slug
     title:   'What the entry is about',
     date:    '2026-10-16',                   // YYYY-MM-DD
     tags:    ['Challenge', 'Python'],        // first tag is shown on the home page
     summary: 'One or two sentences shown in the list.',
     url:     'my-article.html',              // optional: a standalone article page;
                                              // the entry then needs no body
     cover:   'assets/img/my-cover.svg',      // optional: image shown in the list,
     coverAlt: 'What the image shows',        // with its description
     body: `
       Write with a few simple rules (see the example entry below):
       blank line = new paragraph, ## = heading, - = list item,
       > = quote, ```code``` = code block, `code`, **bold**, [link](https://...)
     `,
   },

   Suggested tags: Challenge, Solved, Learning, Update, Lesson, Mistake
   plus the technology involved (Python, React, Java, ...).
   Delete the example entry once you have written a real one.
   ========================================================================== */
window.POSTS = [
  {
    // A long-form article with its own page: `url` sends the journal list and the
    // home page straight to it, and `minutes` replaces the word-count estimate.
    slug: 'reverse-engineering-to-local-voice-dictation',
    url: 'journal-rea-flow-clone.html',
    cover: 'assets/img/journal-flow-cover.svg',
    coverAlt: 'Illustration: a sound wave flows into a local AI model chip, which flows into an app window with the pasted text',
    title: 'From Reverse Engineering to a Local Voice Dictation App',
    date: '2026-10-17',
    minutes: 15,
    tags: ['Reverse engineering', 'Electron', 'Local AI'],
    summary: 'Exploring REA, investigating Wispr Flow, and building a desktop voice dictation prototype with Electron and whisper.cpp.',
  },
  {
    slug: 'example-how-this-journal-works',
    title: 'How this journal works',
    date: '2026-10-16',
    tags: ['Example'],
    example: true,
    summary: 'An example entry that shows the formatting. Delete it from assets/js/posts.js when you publish your first real post.',
    body: `
This is an **example entry**. It is not a real post, and it does not appear on the home page.

## What a good entry covers

An entry works best when it answers four questions:

- What was the situation or problem?
- What did I try, and what failed?
- What finally worked, and why?
- What would I do differently next time?

## Showing code

Wrap code in three backticks. Add the language after the opening fence if you like:

\`\`\`js
const greet = (name) => \`Hello, \${name}!\`;
console.log(greet('journal'));
\`\`\`

Inline code like \`git rebase\` uses single backticks.

## Quotes and links

> A short quote, a lesson learned, or a note to your future self.

Links work too: [the MDN web docs](https://developer.mozilla.org/).
    `,
  },
];

/* Ideas for first entries, each taken from code that exists in my repositories.
   They are shown on the journal page while no real entries exist, and disappear
   automatically once the first real entry is published. These are topics,
   not articles: edit or delete them freely. */
window.JOURNAL_IDEAS = [
  'Parsing JSON from an LLM that sometimes wraps it in code fences',
  'Falling back to a second Gemini model when quota runs out',
  'Letting an LLM query a database through typed tools (Laravel MCP and Gemini function calling)',
  'What my first Spring Boot and Ollama chat app got wrong',
  'Implementing SM-2 spaced repetition for flashcards',
];
