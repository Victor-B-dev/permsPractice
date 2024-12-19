export type User = { roles: Role[]; id: string }

type Role = keyof typeof ROLES
type Permission = (typeof ROLES)[Role][number]

/* Instead of putting the checks in other files where we'd be retyping privileges on each element that could be manipulated
We instead put it in this authentification file and import/export it into code where necessary.
*/

const ROLES = {
  admin: [
    "view:comments",
    "create:comments",
    "update:comments",
    "delete:comments",
  ],
  moderator: ["view:comments", "create:comments", "delete:comments"],
  user: ["view:comments", "create:comments", "delete:ownComments"],
} as const

export function hasPermission(user: User, permission: Permission) {
  return user.roles.some(role =>
    (ROLES[role] as readonly Permission[]).includes(permission)
  )
}

// For example we could have something like this - a user has an id and a role, from above we have one place we can see all the permissions they have
const user: User = { id: "1", roles: ["user"] }

// in the file that's rendered, we'd have HasPermission attached to the element so the user only sees/can change the things they have the role for.
// e.g. if someone is logged in they could post comments on a video. - this would be better than attaching an if bloated if else check to every element.
hasPermission(user, "create:comments")

// e.g. can view all comments
hasPermission(user, "view:comments")


/* However there are limitations with this system. As permissions and object states (attributes) that the roles will be interacting with become more complicated.
It will still be a bit unwieldy to make sure the permissions are handled appropriately.

E.g. on a blog, one may want to let only admins delete content after it has been published. 
Publish is an attribute that needs to be checked i.e. another state in the file. This would need to be handled in the specific location.

For relatively simple systems, RBAC is fine.

A system like this would be not unlike auth files we've previously used and can be used as middle ware.
The session token issued after the authentification can be used to also give the perms (done this before - JWT/session token)
*/

/* In a database sense, we have basic three tables. Users, Role, Permission
With join tables of UserRole and RolePermissions.

Another common table addition is "Organization" or in Discord a "server" (even more colloquially it's guilds).
Joining an organization/server/guild means you can have certain UserRoles that each grant their own sets of permissions.

To move up from there, to say Google Drive, there may be something like blogs (just text article).
Users table will be joined with blog to make UserBlogRole.
We will need to create blog role and create a join table with permissions.
This is very similar to the regular user/role/permission but its another extra layer.

This gets worse as more and more resources need to be shared (video/images/etc).

Hence if we want to extrapolate further so we don't repeat these join tables - we need a generic type for these resources.
And we get ABAC.
*/