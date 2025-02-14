# Convex R2 Component

[![npm version](https://badge.fury.io/js/@convex-dev%2Fr2.svg)](https://badge.fury.io/js/@convex-dev%2Fr2)

<!-- START: Include on https://convex.dev/components -->

Store and serve files with Cloudflare R2.

```ts
// Upload files from React
const uploadFile = useUploadFile(api.example);
// ...in a callback
const key = await uploadFile(file);

// Access files on the server
const url = await r2.getUrl(key);
const response = await fetch(url);
```

**Check out the [example app](example) for a complete example.**

## Prerequisites

### Cloudflare Account

- [Create a Cloudflare account](https://cloudflare.com)
- [Create an R2 bucket](https://developers.cloudflare.com/r2/buckets/create-buckets/)
- Set the bucket name as an environment variable `R2_BUCKET` in your Convex
  deployment
- [Add a CORS policy](https://developers.cloudflare.com/r2/buckets/cors/#add-cors-policies-from-the-dashboard) to the bucket allowing GET and PUT requests from your
  Convex app. You can also use '\*' to allow all origins (use with caution).
  ```json
  [
    {
      "AllowedOrigins": ["http://localhost:5173"],
      "AllowedMethods": ["GET", "PUT"],
      "AllowedHeaders": ["Content-Type"]
    }
  ]
  ```
- Create an API token
  - On the main R2 page in your Cloudflare dashboard, click **Manage R2 API
    Tokens**
  - Click **Create API Token**
  - Edit the token name
  - Set permissions to **Object Read & Write**
  - Under **Specify bucket**, select the bucket you created above
  - Optionally change TTL
  - Click **Create API Token**
- On the next screen you'll be provided with four values that you'll need later:
  - **Token Value**: `R2_TOKEN`
  - **Access Key ID**: `R2_ACCESS_KEY_ID`
  - **Secret Access Key**: `R2_SECRET_ACCESS_KEY`
  - **Endpoint**: `R2_ENDPOINT`

### Convex App

You'll need a Convex App to use the component. Follow any of the [Convex quickstarts](https://docs.convex.dev/home) to set one up.

## Installation

Install the component package:

```ts
npm install @convex-dev/r2
```

Create a `convex.config.ts` file in your app's `convex/` folder and install the component by calling `use`:

```ts
// convex/convex.config.ts
import { defineApp } from "convex/server";
import r2 from "@convex-dev/r2/convex.config";

const app = defineApp();
app.use(r2);

export default app;
```

Set your API credentials using the values you recorded earlier:

```sh
npx convex env set R2_TOKEN xxxxx
npx convex env set R2_ACCESS_KEY_ID xxxxx
npx convex env set R2_SECRET_ACCESS_KEY xxxxx
npx convex env set R2_ENDPOINT xxxxx
npx convex env set R2_BUCKET xxxxx
```

## Uploading files

File uploads to R2 typically use signed urls. The R2 component provides a React
hook that handles the entire upload processs:

- generates the signed url
- uploads the file to R2
- stores the file's metadata in your Convex database

1. Instantiate a R2 component client in a file in your app's `convex/` folder:

   ```ts
   // convex/example.ts
   import { R2 } from "@convex-dev/r2";
   import { components } from "./_generated/api";

   export const r2 = new R2(components.r2);

   export const { generateUploadUrl, syncMetadata } = r2.clientApi({
     checkUpload: async (ctx, bucket) => {
       // const user = await userFromAuth(ctx);
       // ...validate that the user can upload to this bucket
     },
     onUpload: async (ctx, key) => {
       // ...do something with the key
       // Runs in the `syncMetadata` mutation, as the upload is performed from the
       // client side. Convenient way to create relations between the newly created
       // object key and other data in your Convex database. Runs after the `checkUpload`
       // callback.
     },
   });
   ```

2. Use the `useUploadFile` hook in a React component to upload files:

   ```tsx
   // src/App.tsx
   import { FormEvent, useRef, useState } from "react";
   import { useAction } from "convex/react";
   import { api } from "../convex/_generated/api";
   import { useUploadFile } from "@convex-dev/r2/react";

   export default function App() {
     // Passing the entire api exported from `convex/example.ts` to the hook.
     // This must include `generateUploadUrl` and `syncMetadata` from the r2 client api.
     const uploadFile = useUploadFile(api.example);
     const imageInput = useRef<HTMLInputElement>(null);
     const [selectedImage, setSelectedImage] = useState<File | null>(null);

     async function handleUpload(event: FormEvent) {
       event.preventDefault();

       // The file is uploaded to R2, metadata is synced to the database, and the
       // key of the newly created object is returned.
       await uploadFile(selectedImage!);
       setSelectedImage(null);
       imageInput.current!.value = "";
     }
     return (
       <form onSubmit={handleUpload}>
         <input
           type="file"
           accept="image/*"
           ref={imageInput}
           onChange={event => setSelectedImage(event.target.files![0])}
           disabled={selectedImage !== null}
         />
         <input
           type="submit"
           value="Upload"
           disabled={selectedImage === null}
         />
       </form>
     );
   }
   ```

### Using a custom object key

The `r2.generateUploadUrl` function generates a uuid to use as the object key by
default, but a custom key can be provided if desired. Note: the `generateUploadUrl`
function returned by `r2.clientApi` does not accept a custom key, as that
function is a mutation to be called from the client side and you don't want your
client defining your object keys. Providing a custom key requires making your
own mutation that calls the `generateUploadUrl` method of the `r2` instance.

```ts
// convex/example.ts
import { R2 } from "@convex-dev/r2";
import { components } from "./_generated/api";

export const r2 = new R2(components.r2);

// A custom mutation that creates a key from the user id and a uuid
export const generateUploadUrlWithCustomKey = mutation({
  args: {},
  handler: async (ctx) => {
    // Replace this with whatever function you use to get the current user
    const currentUser = await getUser(ctx);
    if (!currentUser) {
      throw new Error("User not found");
    }
    const key = `${currentUser.id}.${crypto.randomUUID()}`;
    return r2.generateUploadUrl(key);
  },
});
```

## Serving Files
Files stored in R2 can be served to your users by generating a URL pointing to a given file.

### Generating file URLs in queries
The simplest way to serve files is to return URLs along with other data required by your app from queries and mutations.

A file URL can be generated from a object key by the `r2.getUrl` function of the
R2 component client.

```ts
// convex/listMessages.ts
import { components } from "./_generated/api";
import { query } from "./_generated/server";
import { R2 } from "@convex-dev/r2";

const r2 = new R2(components.r2);

export const list = query({
  args: {},
  handler: async (ctx) => {
    // In this example, messages have an imageKey field with the object key
    const messages = await ctx.db.query("messages").collect();
    return Promise.all(
      messages.map(async (message) => ({
        ...message,
        imageUrl: await r2.getUrl(message.imageKey),
      })),
    );
  },
});
```

File URLs can be used in img elements to render images:

```tsx
// src/App.tsx
function Image({ message }: { message: { url: string } }) {
  return <img src={message.url} height="300px" width="auto" />;
}
```

## Deleting Files

Files stored in R2 can be deleted from actions via the `r2.delete` function, which accepts an object key.

```ts
// convex/images.ts
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { R2 } from "@convex-dev/r2";

const r2 = new R2(components.r2);

export const deleteByKey = mutation({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    return await r2.deleteByKey(args.key);
  },
});
```

## Accessing File Metadata
File metadata of an R2 file can be accessed from actions via `r2.getMetadata`:

```ts
// convex/images.ts
import { v } from "convex/values";
import { query } from "./_generated/server";
import { R2 } from "@convex-dev/r2";

const r2 = new R2(components.r2);

export const getMetadata = query({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    return await r2.getMetadata(args.key);
  },
});
```

This is an example of the returned document:

```json
{
  "ContentType": "image/jpeg",
  "ContentLength": 125338,
  "LastModified": "2024-03-20T12:34:56Z",
}
```

The returned document has the following fields:

- `ContentType`: the ContentType of the file if it was provided on upload
- `ContentLength`: the size of the file in bytes
- `LastModified`: the last modified date of the file


### Listing and paginating metadata

Metadata can be listed or paginated from actions via `r2.listMetadata` and `r2.pageMetadata`.

```ts
// convex/example.ts
import { query } from "./_generated/server";
import { R2 } from "@convex-dev/r2";

const r2 = new R2(components.r2);

export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return r2.listMetadata(ctx, args.limit);
  },
});

export const page = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return r2.pageMetadata(ctx, args.paginationOpts);
  },
});
```

<!-- END: Include on https://convex.dev/components -->
