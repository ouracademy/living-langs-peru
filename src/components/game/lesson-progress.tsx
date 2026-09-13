type LessonProgressProps = {
  answered: number;
  total: number;
};

export function LessonProgress({ answered, total }: LessonProgressProps) {
  const percent = total === 0 ? 0 : Math.round((answered / total) * 100);

  return (
    <div
      role="progressbar"
      aria-label="Progreso de la lección"
      aria-valuenow={answered}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuetext={`${answered} de ${total}`}
      className="h-3 w-full overflow-hidden rounded-full bg-gray-200"
    >
      <div
        className="h-full rounded-full bg-[#1B98A0] motion-safe:transition-[width] motion-safe:duration-300"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
