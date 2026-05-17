import branchLP from '../assets/branchLP.jpg'
import branchTaguig from '../assets/branchTaguig.jpg'
import pawRangLogomark from '../assets/PawRang Logomark.png'

export default function UserAuthVisual() {
    return (
        <div className='imageBackground' aria-label='PawRang branches'>
            <img className='authSlide authSlideOne' src={branchLP} alt='PawRang branch lobby' />
            <img className='authSlide authSlideTwo' src={branchTaguig} alt='PawRang Taguig branch' />
        </div>
    )
}

export function UserAuthPoweredBy() {
    return (
        <div className='authPoweredBy'>
            <span>Powered by</span>
            <img src={pawRangLogomark} alt='PawRang' />
        </div>
    )
}
