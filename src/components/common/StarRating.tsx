import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number; // e.g. 0, 3.7, 4.2, 4.8
  ratingCount?: number; // total valid review count
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showCount?: boolean;
  showRatingNumber?: boolean;
  className?: string;
  countLabel?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating = 0,
  ratingCount,
  size = 'sm',
  showCount = true,
  showRatingNumber = false,
  className = '',
  countLabel,
}) => {
  // Clamp rating between 0 and 5, round to 1 decimal place
  const validRating = Math.max(0, Math.min(5, Number(rating) || 0));
  const roundedRating = Number(validRating.toFixed(1));

  // Determine size classes
  const starDimensions = {
    xs: { star: 'w-3 h-3', text: 'text-[11px]' },
    sm: { star: 'w-3.5 h-3.5', text: 'text-xs' },
    md: { star: 'w-4 h-4', text: 'text-sm' },
    lg: { star: 'w-5 h-5', text: 'text-base' },
  }[size];

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* 5 Stars with precise fractional fill */}
      <div className="flex items-center gap-0.5" aria-label={`Rating: ${roundedRating} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((starIndex) => {
          // Calculate fill percentage for this particular star
          let fillPct = 0;
          if (validRating >= starIndex) {
            fillPct = 100;
          } else if (validRating > starIndex - 1) {
            fillPct = Math.round((validRating - (starIndex - 1)) * 100);
          }

          return (
            <div
              key={starIndex}
              className={`relative inline-block ${starDimensions.star} shrink-0`}
            >
              {/* Background Empty Star */}
              <Star
                className={`${starDimensions.star} text-slate-200 fill-slate-100`}
                strokeWidth={1.5}
              />

              {/* Foreground Proportional Fill Overlay */}
              {fillPct > 0 && (
                <div
                  className="absolute top-0 left-0 bottom-0 overflow-hidden"
                  style={{ width: `${fillPct}%` }}
                >
                  <Star
                    className={`${starDimensions.star} text-amber-400 fill-amber-400`}
                    strokeWidth={1.5}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Numeric Rating Display (Optional) */}
      {showRatingNumber && (
        <span className={`font-black text-slate-900 ${starDimensions.text}`}>
          {roundedRating > 0 ? roundedRating.toFixed(1) : '0.0'}
        </span>
      )}

      {/* Verified Reviews Count */}
      {showCount && typeof ratingCount === 'number' && (
        <span className={`text-slate-400 font-medium ${starDimensions.text}`}>
          {countLabel ? (
            `${ratingCount.toLocaleString()} ${countLabel}`
          ) : (
            `(${ratingCount.toLocaleString()})`
          )}
        </span>
      )}
    </div>
  );
};
