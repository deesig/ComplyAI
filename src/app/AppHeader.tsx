//import {Link} from "react-router-dom";
import "./css/index.css"
import "./css/global.css"

export default function AppHeader() {
    return (
      <header className="container">
          <div className="header-items">
            <p></p>
            
            <a href="index.html" style={{textDecoration: 'none'}}>
            AI Compliance Checker
            </a>

            <a href="profile.html">
                <button className="icon"><i className="fa-solid fa-user"></i></button>
            </a>
        </div>
      </header>
)
    ;
}
