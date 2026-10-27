import type { Game } from "@/lib/data";
import { TeamSelect } from "@/components/admin";
import { saveGame } from "@/app/admin/actions";

export function GameForm({ game }: { game?: Game }) {
  const [date, time = ""] = (game?.date ?? "").split("T");
  return (
    <form action={saveGame} className="aform">
      {game && <input type="hidden" name="id" value={game.id} />}
      <div className="row">
        <label className="f">
          <span>Date</span>
          <input type="date" name="date" required defaultValue={date} />
        </label>
        <label className="f">
          <span>Face-off</span>
          <input type="time" name="time" defaultValue={time} />
        </label>
      </div>
      <label className="f">
        <span>Opponent</span>
        <input name="opponent" required defaultValue={game?.opponent ?? ""} />
      </label>
      <div className="row">
        <TeamSelect defaultValue={game?.team} />
        <label className="f">
          <span>Home / away</span>
          <select name="home" defaultValue={game ? String(game.home) : "1"}>
            <option value="1">Home</option>
            <option value="0">Away</option>
          </select>
        </label>
      </div>
      <div className="row">
        <label className="f">
          <span>Venue</span>
          <input name="venue" defaultValue={game?.venue ?? ""} placeholder="Braehead Arena" />
        </label>
        <label className="f">
          <span>Competition</span>
          <input name="competition" defaultValue={game?.competition ?? ""} placeholder="BUIHA league" />
        </label>
      </div>
      <div className="row">
        <label className="f">
          <span>Stags score</span>
          <input type="number" min={0} name="our_score" defaultValue={game?.our_score ?? ""} />
        </label>
        <label className="f">
          <span>Opponent score</span>
          <input type="number" min={0} name="their_score" defaultValue={game?.their_score ?? ""} />
        </label>
      </div>
      {game && (
        <label className="f">
          <span>Game notes</span>
          <textarea name="notes" defaultValue={game.notes ?? ""} />
        </label>
      )}
      <button className="btn btn-sm btn-dark" type="submit" style={{ justifySelf: "start" }}>
        {game ? "Save game" : "Add game"}
      </button>
    </form>
  );
}
