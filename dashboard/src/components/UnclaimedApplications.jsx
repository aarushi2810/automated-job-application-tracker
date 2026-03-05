export default function UnclaimedApplications() {
  // The old "claim unassigned applications" flow is no longer needed now that
  // the extension associates ingested applications directly with the logged-in
  // user via a JWT. We keep this component as a simple hint for users who may
  // still have an older extension installed.
  return (
    <div className="claim-box">
      <p>
        New extension versions automatically attach applications to your
        account. If you used an older version, some unassigned applications may
        still exist in the database.
      </p>
    </div>
  );
}
