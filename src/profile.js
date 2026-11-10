// Everything personal on the site lives here, so it's one file to edit.
// Leave a link as '' to hide its button.

export const PROFILE = {
  name: 'Joey Lurie',
  role: 'Finance, Miami University',
  blurb:
    "I'm a finance major at Miami University's Farmer School of Business. I built this simulator to show how I think about risk: every number on the page comes from a model I can explain line by line.",
  facts: [
    { k: 'School', v: 'Farmer School of Business, Class of 2029' },
    { k: 'GPA', v: '3.77, President’s List' },
    { k: 'Banking Club', v: '1 of 17 admitted from 200+ applicants' },
    { k: 'CarbonWeb', v: 'Solutions Engineering Intern' },
    { k: 'Stock pitch', v: 'Constellation Energy, Cleveland Research Company competition' },
    { k: 'Case comp', v: 'William Blair IB Case Competition, sell-side M&A' },
  ],
  links: {
    linkedin: '', // e.g. 'https://www.linkedin.com/in/your-handle'
    email: '', // e.g. 'you@example.com'
    resume: '', // e.g. './resume.pdf' (put the file in the public folder)
  },
};

// Free-to-use photos from Unsplash (Unsplash License).
const u = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=2000&q=70`;
export const PHOTOS = {
  hero: u('photo-1601923112035-3e4819c82317'),
  model: u('photo-1611974789855-9c2a0a7236a3'),
  about: u('photo-1599939571322-792a326991f2'),
};
