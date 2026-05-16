import Card, { CardBody, CardHeader } from "./Card";
import Skeleton from "./Skeleton";

export default function PageLoader({ title = "Loading…", rows = 6 }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</div>
            <div className="mt-2 flex gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
          <Skeleton className="h-10 w-28" />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full lg:col-span-2" />
        </div>
      </CardHeader>
      <CardBody>
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
