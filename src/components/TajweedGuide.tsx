import { LEGEND } from '../lib/tajweed'
import { Sheet } from './Sheet'

/** The colour key of the tajweed mushaf. */
export function TajweedGuide({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="ألوان التجويد" onClose={onClose}>
      <ul className="tajweed-legend">
        {LEGEND.map((l) => (
          <li key={l.cls}>
            <span className={`tj-dot tj-${l.cls}`} aria-hidden="true" />
            <div>
              <strong className={`tj-${l.cls}`}>{l.name}</strong>
              <small>{l.detail}</small>
            </div>
          </li>
        ))}
      </ul>
      <p className="muted">
        الأحكام لرواية حفص عن عاصم، من مصدرين مستقلين طوبق بينهما على نص المصحف كله: اتفقا في ٩٨٪ أو أكثر من مواضع
        الغنة والقلقلة والمد اللازم والمتصل. التلوين وسيلة مساعدة، والأصل التلقي عن شيخ متقن.
      </p>
    </Sheet>
  )
}
