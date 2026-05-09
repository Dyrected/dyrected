import { users } from "./collections/users.ts";
import { media } from "./collections/media.ts";
import { pages } from "./collections/pages.ts";
import { posts } from "./collections/posts.ts";
import { inquiries } from "./collections/inquiries.ts";
import { comments } from "./collections/comments.ts";

import { navigation } from "./globals/navigation.ts";
import { settings } from "./globals/settings.ts";

export const collections = [users, media, pages, posts, inquiries, comments];
export const globals = [navigation, settings];
