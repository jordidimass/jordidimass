export interface Link {
  title: string;
  href: string;
}

export interface ProfileData {
  name: string;
  avatar: string;
  links: Link[];
  socials: Link[];
}

export const profileData: ProfileData = {
  name: "Jordi Dimas",
  avatar: "https://utfs.io/f/c07cbb6c-bf22-46bc-bdc3-c711408f5856-1xaifo.jpg",
  links: [
    { title: "occasional photographer", href: "https://unsplash.com/@jordidimass" },
    { title: "VSCO gallery", href: "https://vsco.co/jordidimass/gallery" },
    { title: "some repos", href: "https://github.com/jordidimass?tab=repositories" },
    { title: "book reviews", href: "https://goodreads.com/jordidimass" },
    { title: "music journey", href: "https://last.fm/user/jordidimass" },
    { title: "spotify playlist", href: "https://open.spotify.com/user/jordidimass/playlists" },
    { title: "film diary", href: "https://letterboxd.com/jordidimass/" }
  ],
  socials: [
    { title: "X", href: "https://X.com/jordidimass" },
    { title: "Instagram", href: "https://instagram.com/jordidimass" },
    { title: "LinkedIn", href: "https://www.linkedin.com/in/jordidimass/" },
    { title: "GitHub", href: "https://github.com/jordidimass" },
    { title: "Telegram", href: "https://t.me/jordidimass" }
  ]
};
