type Comment = {
  id: string
  body: string
  authorId: string
  createdAt: Date
}

type Todo = {
  id: string
  title: string
  userId: string
  completed: boolean
  invitedUsers: string[]
}

type Role = "admin" | "moderator" | "user"
type User = { blockedBy: string[]; roles: Role[]; id: string }

// the type safety here is to make sure to line 30 is to allow make sure the permissions below follow proper actions
type PermissionCheck<Key extends keyof Permissions> =
  | boolean
  | ((user: User, data: Permissions[Key]["dataType"]) => boolean)

type RolesWithPermissions = {
  [R in Role]: Partial<{
    [Key in keyof Permissions]: Partial<{
      [Action in Permissions[Key]["action"]]: PermissionCheck<Key>
    }>
  }>
}

// defining the resource and what can be done to it (attributes)
type Permissions = {
  comments: {
    dataType: Comment
    action: "view" | "create" | "update" // can fine tune as we need
  }
  todos: {
    // Can do something like Pick<Todo, "userId"> to get just the rows you use
    dataType: Todo
    action: "view" | "create" | "update" | "delete"
  }
}

const ROLES = {
  admin: {
    comments: {
      view: true,
      create: true,
      update: true,
    },
    todos: {
      view: true,
      create: true,
      update: true,
      delete: true,
    },
  },
  moderator: {
    comments: {
      view: true,
      create: true,
      update: true,
    },
    todos: {
      view: true,
      create: true,
      update: true,
      delete: (user, todo) => todo.completed, // this particular line is important, the moderator can only act on a todo that has been marked complete, this would need to be written in a local way otherwise
    },
  },
  user: {
    comments: {
      view: (user, comment) => !user.blockedBy.includes(comment.authorId),
      create: true,
      update: (user, comment) => comment.authorId === user.id,
    },
    todos: {
      view: (user, todo) => !user.blockedBy.includes(todo.userId),
      create: true,
      update: (user, todo) =>
        todo.userId === user.id || todo.invitedUsers.includes(user.id),
      delete: (user, todo) =>
        (todo.userId === user.id || todo.invitedUsers.includes(user.id)) &&
        todo.completed,
    },
  },
} as const satisfies RolesWithPermissions 
// as const is a type assertion that locks the object & its values as a type-- in this case for example, a sub type like admin/mod/user could not be changed to another string
// makes sure the resulting type matches with a predefined type (RolesWithPermissions)

export function hasPermission<Resource extends keyof Permissions>(
  user: User,
  resource: Resource,
  action: Permissions[Resource]["action"],
  data?: Permissions[Resource]["dataType"]
) {
  return user.roles.some(role => {
    const permission = (ROLES as RolesWithPermissions)[role][resource]?.[action]
    if (permission == null) return false

    if (typeof permission === "boolean") return permission
    return data != null && permission(user, data)
  })
}

// USAGE:
const user: User = { blockedBy: ["2"], id: "1", roles: ["user"] }
const todo: Todo = {
  completed: false,
  id: "3",
  invitedUsers: [],
  title: "Test Todo",
  userId: "1",
}

// Can create a comment
hasPermission(user, "comments", "create")

// Can view the `todo` Todo
hasPermission(user, "todos", "view", todo)

// Can view all todos
hasPermission(user, "todos", "view")


/* ABAC means that permissions can be more granularly assigned in that role perms can be set based on attributes of a resource.
See line 69 - a moderator can only delete a todo that is marked complete by a user. This is impossible iin a RBAC system without writing multiple checks.
Each dataType (could be more than comments and todos here, such as images, etc) has more attributes attached to them, e.g. line 1-14.
But as can be seen, the system is way more robust in handling specific interactions and not needing to write as complicated checks in specific scenarios because the states/attributes are better defined.

E.g. complex interaction - a user can create comments however they want. They can view all comments EXCEPT by users they've been blocked by.
Tracking blocks separately would be a headache, attaching it to the resource itself as an attribute as an array of ids makes this seamless.
*/