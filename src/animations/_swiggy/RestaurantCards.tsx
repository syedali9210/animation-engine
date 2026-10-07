// Swiggy App — restaurant cards: the TOP RATED / FOOD IN 15 MINS switch over a row of them (a snapping row on phones,
// two whole cards and a peek of the next at any width; four across from md up).
import { RESTAURANTS, type Restaurant } from "./data"
import { PRESS } from "./motion"
import { FavButton, One, ROW, Rating, Segmented, WRAP } from "./ui"

export function RestaurantCard({ r, fav, onFav, artwork = false }: { r: Restaurant; fav: boolean; onFav: () => void; artwork?: boolean }) {
  return (
    <article className={`w-[clamp(140px,calc((100vw-64px)/2),220px)] shrink-0 snap-start md:w-auto ${PRESS}`}>
      <div className="relative aspect-[6/7] overflow-hidden rounded-[16px] bg-[#ddd]">
        <img src={r.img} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        <span className="absolute left-2 top-2 grid h-7 w-[50px] place-items-center rounded-full bg-[#fff1e7] leading-none">
          <One className="text-[21px]" artwork={artwork} />
        </span>
        <FavButton on={fav} onToggle={onFav} label={`Save ${r.name}`} className="absolute right-0 top-0" />
        {r.offer && <p className="absolute bottom-2.5 left-3 whitespace-pre-line text-[15px] font-extrabold leading-[18px] text-white">{r.offer}</p>}
        {r.ad && <span className="absolute bottom-2.5 right-3 text-[10px] font-semibold text-white/80">AD</span>}
      </div>
      <h3 className="mt-2 truncate text-[15px] font-bold leading-[20px] text-[#202125]">{r.name}</h3>
      <p className="mt-0.5 flex items-center gap-1 whitespace-nowrap text-[13px] font-semibold leading-[18px] text-[#2b2b33]">
        <Rating size={16} />
        {r.rating} • 15-20 mins
      </p>
      <p className="text-[13px] leading-[18px] text-[#6b6d73]">{r.cat}</p>
    </article>
  )
}

export function RestaurantSection({ seg, onSeg, favs, onFav }: { seg: number; onSeg: (i: number) => void; favs: string[]; onFav: (name: string) => void }) {
  return (
    <div>
      <div className={WRAP}>
        <Segmented label="Restaurants" options={["TOP RATED", "FOOD IN 15 MINS"]} value={seg} onChange={onSeg} />
      </div>
      <div className="mx-auto mt-4 max-w-[1200px]">
        <div className={`${ROW} md:grid-cols-4`}>
          {RESTAURANTS.map((r, i) => (
            <RestaurantCard key={r.name} r={r} artwork={i === 0} fav={favs.includes(r.name)} onFav={() => onFav(r.name)} />
          ))}
        </div>
      </div>
    </div>
  )
}
