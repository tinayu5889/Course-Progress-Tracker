export function formatRemainingLessons(uncompletedNums: number[]): string {
  if (!uncompletedNums || uncompletedNums.length === 0) {
    return "全部完成";
  }
  
  const sorted = [...uncompletedNums].sort((a, b) => a - b);
  const groups: string[] = [];
  
  let start = sorted[0];
  let end = sorted[0];
  
  for (let i = 1; i <= sorted.length; i++) {
    if (i < sorted.length && sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      if (start === end) {
        groups.push(`L${start}`);
      } else {
        groups.push(`L${start}-L${end}`);
      }
      if (i < sorted.length) {
        start = sorted[i];
        end = sorted[i];
      }
    }
  }
  
  return groups.join(", ");
}
