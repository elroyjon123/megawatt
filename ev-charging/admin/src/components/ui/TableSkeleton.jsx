import Skeleton from "./Skeleton";
import { Table, TableContainer, TBody, THead, TD, TH, TR } from "./Table";

export default function TableSkeleton({ columns = 6, rows = 8 }) {
  return (
    <TableContainer>
      <Table>
        <THead>
          <TR className="hover:bg-transparent">
            {Array.from({ length: columns }).map((_, i) => (
              <TH key={i}>
                <Skeleton className="h-4 w-20" />
              </TH>
            ))}
          </TR>
        </THead>
        <TBody>
          {Array.from({ length: rows }).map((_, r) => (
            <TR key={r}>
              {Array.from({ length: columns }).map((_, c) => (
                <TD key={c}>
                  <Skeleton className="h-4 w-full" />
                </TD>
              ))}
            </TR>
          ))}
        </TBody>
      </Table>
    </TableContainer>
  );
}
