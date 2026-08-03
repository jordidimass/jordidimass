export type TrackKey =
  | "volumes_dream" | "toro_loop" | "title_fight_pain" | "spiritbox_perfect_soul"
  | "jeff_rosenstock_begged" | "jj_cale_magnolia" | "gomez_stone_wobble"
  | "elliott_smith_pictures" | "beach_fossils_sleep_apnea";

export const TRACKS: Record<TrackKey, { src: string; title: string }> = {
  volumes_dream: {
    src: "https://1xeofxv5bf.ufs.sh/f/3u6FbciEmQpg8qHBdmAIsDQ1FzjA34lpnbtd0of6O9LNcXYw",
    title: "Volumes - Dream",
  },
  toro_loop: {
    src: "https://1xeofxv5bf.ufs.sh/f/3u6FbciEmQpgpNs05dfP1TAS7tIHOfir8NDYmEceBxCk2ubF",
    title: "Toro y Moi - The Loop",
  },
  title_fight_pain: {
    src: "https://1xeofxv5bf.ufs.sh/f/3u6FbciEmQpgMY9oQUab3adgKJBQcbSE1moz5WsTNqLuGXvA",
    title: "Title Fight - Your Pain Is Mine Now",
  },
  spiritbox_perfect_soul: {
    src: "https://1xeofxv5bf.ufs.sh/f/3u6FbciEmQpgOfDqA03D8XitW6okhZAf9QrxjYSC0gmwazqM",
    title: "Spiritbox - Perfect Soul",
  },
  jeff_rosenstock_begged: {
    src: "https://1xeofxv5bf.ufs.sh/f/3u6FbciEmQpgakKFKJyrmFGB1wC7zM34P9qol6VJ5uKhjpUx",
    title: "Jeff Rosenstock - We Begged 2 Explode",
  },
  jj_cale_magnolia: {
    src: "https://1xeofxv5bf.ufs.sh/f/3u6FbciEmQpg1o74PBuGQoD4dPUEfsiVRb2g5a6XcAZNnWMF",
    title: "J.J. Cale - Magnolia",
  },
  gomez_stone_wobble: {
    src: "https://1xeofxv5bf.ufs.sh/f/3u6FbciEmQpgjmDXn3kJFpU6XwaSAylbHo1ODQBGr9u4CndR",
    title: "Gomez - 78 Stone Wobble",
  },
  elliott_smith_pictures: {
    src: "https://1xeofxv5bf.ufs.sh/f/3u6FbciEmQpgz3O0xQ43lFvG5BIYLZQSgymkabWAKR4q9Cth",
    title: "Elliott Smith - Pictures Of Me",
  },
  beach_fossils_sleep_apnea: {
    src: "https://1xeofxv5bf.ufs.sh/f/3u6FbciEmQpgad4pw0yrmFGB1wC7zM34P9qol6VJ5uKhjpUx",
    title: "Beach Fossils - Sleep Apnea",
  },
};

export const TRACK_ORDER: TrackKey[] = [
  "volumes_dream", "toro_loop", "title_fight_pain", "spiritbox_perfect_soul",
  "jeff_rosenstock_begged", "jj_cale_magnolia", "gomez_stone_wobble",
  "elliott_smith_pictures", "beach_fossils_sleep_apnea",
];
