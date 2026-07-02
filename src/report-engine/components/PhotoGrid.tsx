import type { ReportPhoto } from '../models/report-view-model'

import { ReportMixedText } from './ReportMixedText'

type PhotoGridProps = {
  photos: ReportPhoto[]
}

export function PhotoGrid({ photos }: PhotoGridProps) {
  if (photos.length === 0) {
    return (
      <p className="report-empty" role="status">
        No visit photos.
      </p>
    )
  }

  return (
    <ul className="report-photo-grid">
      {photos.map((photo) => (
        <li key={photo.id} className="report-photo-grid__item">
          <figure className="report-photo-grid__figure">
            <img
              className="report-photo-grid__image"
              src={photo.src}
              alt={photo.alt}
              loading="eager"
              decoding="sync"
            />
            <figcaption className="report-photo-grid__caption">
              <ReportMixedText text={photo.alt} />
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  )
}
