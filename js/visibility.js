(() => {
  "use strict";

  function evaluate(resource, now = new Date()) {
    if (!resource) return { visible: false, status: "hidden" };
    if (resource.status === "published") return { visible: true, status: "published" };
    if (resource.status === "locked") return { visible: true, status: "locked" };
    if (resource.status === "scheduled") {
      const publishAt = new Date(resource.publishAt);
      const valid = !Number.isNaN(publishAt.getTime());
      return valid && now >= publishAt
        ? { visible: true, status: "published" }
        : { visible: false, status: "scheduled" };
    }
    return { visible: false, status: "hidden" };
  }

  // Client-side access codes are not secure. They are a classroom convenience only.
  // Never use this pattern to protect sensitive, private, or regulated information.
  function verifyAccessCode(resource, suppliedCode) {
    return resource?.status === "locked" && String(resource.accessCode || "") === String(suppliedCode || "").trim();
  }

  window.ByteHunterVisibility = { evaluate, verifyAccessCode };
})();
