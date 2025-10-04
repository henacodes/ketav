import { Button } from "@/components/ui/button";
import { NavLink } from "react-router";

export function HomePage() {
  return (
    <div>
      {" "}
      Home Page <NavLink to="/library"> To library</NavLink>
      <Button>Hey</Button>
      <button>Hello</button>
      <p className=" text-emerald-300 "> Test</p>
    </div>
  );
}
