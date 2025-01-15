import { api } from "../convex/_generated/api";
import { useUploadFile } from "@convex-dev/r2/react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useDebouncedCallback } from "use-debounce";
import { Id } from "../convex/_generated/dataModel";
import { Separator } from "@/components/ui/separator";
import { MetadataTable } from "./MetadataTable";
import { GalleryImage } from "@/GalleryImage";

export default function App() {
  // Returns a function that uploads the file to R2, syncs metadata to the
  // Convex database, and returns the key of the uploaded file in case you need
  // it.
  const uploadFile = useUploadFile(api.example);
  const updateImageCaption = useMutation(
    api.example.updateImageCaption
  ).withOptimisticUpdate((localStore, args) => {
    // A small optimistic update function to synchronously update the UI while
    // the mutation is pending.
    const images = localStore.getQuery(api.example.listImages);
    const image = images?.find((image) => image._id === args.id);
    if (image) {
      image.caption = args.caption;
    }
  });
  const deleteImage = useMutation(api.example.deleteObject);

  // Get images from your app's own `images` table
  const images = useQuery(api.example.listImages, {});

  // Get metadata from the R2 component's `metadata` table
  const metadata = usePaginatedQuery(
    api.example.listMetadata,
    {},
    { initialNumItems: 20 }
  );

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    event.preventDefault();
    // `uploadFile` returns the key of the uploaded file, which you can use to
    // associate the file with some other data, like a message.
    const key = await uploadFile(event.target.files![0]);
  }

  // Debounce the updateImageCaption mutation to avoid blocking input changes.
  const debouncedUpdateImageCaption = useDebouncedCallback(
    (id: Id<"images">, caption: string) => {
      void updateImageCaption({ id, caption });
    },
    100,
    {
      maxWait: 100,
    }
  );

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold my-4">Image Gallery</h1>

      <div className="mb-4">
        <Button variant="outline" className="gap-2" asChild>
          <label htmlFor="image-upload" className="cursor-pointer">
            <Upload size={20} />
            Upload Image
          </label>
        </Button>
        <input
          id="image-upload"
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images?.map((image) => (
          <GalleryImage
            key={image._id}
            image={image}
            onDelete={(key) => void deleteImage({ key })}
            onUpdateCaption={(id, caption) =>
              debouncedUpdateImageCaption(id, caption)
            }
          />
        ))}
      </div>

      <Separator className="my-12" />

      <h1 className="text-2xl font-bold mb-4">R2 Admin</h1>

      <div className="mb-4">
        <MetadataTable data={metadata.results ?? []} />
        {metadata.status === "CanLoadMore" && (
          <Button variant="outline" onClick={() => metadata.loadMore(10)}>
            Load More
          </Button>
        )}
      </div>
    </div>
  );
}
