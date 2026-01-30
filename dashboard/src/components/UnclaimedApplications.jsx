import api from "../api/axios";

export default function UnclaimedApplications({ onClaimed }) {
  const claim = async () => {
    await api.post("/applications/claim");
    onClaimed();
  };

  return (
    <div className="claim-box">
      <p>Unclaimed applications detected</p>
      <button className="btn" onClick={claim}>
        Claim my applications
      </button>
    </div>
  );
}
