import WallpaperArtwork from "./WallpaperArtwork";

function WallpaperCard({ wallpaper, onLike, disabledLike }) {
  return (
    <article className="wallpaper-card">
      <WallpaperArtwork wallpaper={wallpaper} alt={wallpaper.title} priority={false} className="wallpaper-card-media-shell" mediaClassName="wallpaper-card-media" />
      <div className="card-content">
        <h3>{wallpaper.title}</h3>
        <p>{wallpaper.description || "No description"}</p>
        <div className="meta-row">
          <span>{wallpaper.views} views</span>
          <span>{wallpaper.likesCount} likes</span>
        </div>
        <div className="chips">
          {wallpaper.categories?.map((cat) => (
            <span key={cat.id} className="chip">
              {cat.name}
            </span>
          ))}
        </div>
        <button
          type="button"
          className="like-btn"
          onClick={() => onLike(wallpaper.id)}
          disabled={disabledLike}
        >
          Like
        </button>
      </div>
    </article>
  );
}

export default WallpaperCard;
