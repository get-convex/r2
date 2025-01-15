import { api } from "../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const columns: ColumnDef<
  (typeof api.example.listMetadata._returnType)[number]
>[] = [
  {
    accessorKey: "bucket",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="pl-0"
        >
          Bucket
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return (
        <a href={row.original.bucketLink} target="_blank" className="underline">
          {row.original.bucket}
        </a>
      );
    },
  },
  {
    accessorKey: "image",
    header: "Image",
    cell: ({ row }) => {
      return (
        <img
          className="max-w-16 max-h-12"
          src={row.original.url}
          alt="R2 object"
        />
      );
    },
  },
  {
    accessorKey: "key",
    header: "Key",
    cell: ({ row }) => {
      return (
        <a href={row.original.link} target="_blank" className="underline">
          {row.original.key}
        </a>
      );
    },
  },
  {
    accessorKey: "size",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="pl-0"
        >
          Size
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const size = parseFloat(row.getValue("size"));
      const formatted = new Intl.NumberFormat("en-US", {
        style: "unit",
        unit: "kilobyte",
        unitDisplay: "narrow",
        maximumFractionDigits: 0,
      }).format(size);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "lastModified",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="pl-0"
        >
          Last Modified
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return new Date(row.getValue("lastModified")).toLocaleString();
    },
  },
];

export const MetadataTable = ({
  data,
}: {
  data: (typeof api.example.listMetadata._returnType)[number][];
}) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
