//import {Link} from "react-router-dom";


import "./css/index.css";
import "./css/global.css";
import Link from "./Link";

export default function AppHeader() {
        return (
            <header>
                <div className="header-items" style={{ position: 'relative', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                            <img src="/ComplyAI_Logo.png" alt="ComplyAI Logo" style={{ objectFit: "contain" }} />
                        </Link>
                    </div>

                                <p
                                    className="header-center-text"
                                    style={{
                                        position: 'absolute',
                                        left: '50%',
                                        top: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        margin: 0,
                                        fontFamily: 'Bodoni MyCustom',
                                        fontStyle: 'italic',
                                        whiteSpace: 'nowrap',
                                        zIndex: 2
                                    }}
                                >
                                    ComplyAI: The Compliance Tool of the Future
                                </p>

                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Link href="/profile">
                            <button className="icon"><i className="fa-solid fa-user"></i></button>
                        </Link>
                    </div>
                </div>
            </header>
        );
}
